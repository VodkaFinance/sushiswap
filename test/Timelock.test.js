const { expectRevert, time } = require('@openzeppelin/test-helpers');
const ethers = require('ethers');
const VodkaToken = artifacts.require('VodkaToken');
const MasterBartender = artifacts.require('MasterBartender');
const MockERC20 = artifacts.require('MockERC20');
const Timelock = artifacts.require('Timelock');

function encodeParameters(types, values) {
    const abi = new ethers.utils.AbiCoder();
    return abi.encode(types, values);
}

contract('Timelock', ([alice, bob, carol, dev, minter]) => {
    beforeEach(async () => {
        this.vodka = await VodkaToken.new({ from: alice });
        this.timelock = await Timelock.new(bob, '259200', { from: alice });
    });

    it('should not allow non-owner to do operation', async () => {
        await this.vodka.transferOwnership(this.timelock.address, { from: alice });
        await expectRevert(
            this.vodka.transferOwnership(carol, { from: alice }),
            'Ownable: caller is not the owner',
        );
        await expectRevert(
            this.vodka.transferOwnership(carol, { from: bob }),
            'Ownable: caller is not the owner',
        );
        await expectRevert(
            this.timelock.queueTransaction(
                this.vodka.address, '0', 'transferOwnership(address)',
                encodeParameters(['address'], [carol]),
                (await time.latest()).add(time.duration.days(4)),
                { from: alice },
            ),
            'Timelock::queueTransaction: Call must come from admin.',
        );
    });

    it('should do the timelock thing', async () => {
        await this.vodka.transferOwnership(this.timelock.address, { from: alice });
        const eta = (await time.latest()).add(time.duration.days(4));
        await this.timelock.queueTransaction(
            this.vodka.address, '0', 'transferOwnership(address)',
            encodeParameters(['address'], [carol]), eta, { from: bob },
        );
        await time.increase(time.duration.days(1));
        await expectRevert(
            this.timelock.executeTransaction(
                this.vodka.address, '0', 'transferOwnership(address)',
                encodeParameters(['address'], [carol]), eta, { from: bob },
            ),
            "Timelock::executeTransaction: Transaction hasn't surpassed time lock.",
        );
        await time.increase(time.duration.days(4));
        await this.timelock.executeTransaction(
            this.vodka.address, '0', 'transferOwnership(address)',
            encodeParameters(['address'], [carol]), eta, { from: bob },
        );
        assert.equal((await this.vodka.owner()).valueOf(), carol);
    });

    it('should also work with MasterBartender', async () => {
        this.lp1 = await MockERC20.new('LPToken', 'LP', '10000000000', { from: minter });
        this.lp2 = await MockERC20.new('LPToken', 'LP', '10000000000', { from: minter });
        this.chef = await MasterBartender.new(this.vodka.address, dev, '1000', '0', '1000', { from: alice });
        await this.vodka.transferOwnership(this.chef.address, { from: alice });
        await this.chef.add('100', this.lp1.address, true);
        await this.chef.transferOwnership(this.timelock.address, { from: alice });
        const eta = (await time.latest()).add(time.duration.days(4));
        await this.timelock.queueTransaction(
            this.chef.address, '0', 'set(uint256,uint256,bool)',
            encodeParameters(['uint256', 'uint256', 'bool'], ['0', '200', false]), eta, { from: bob },
        );
        await this.timelock.queueTransaction(
            this.chef.address, '0', 'add(uint256,address,bool)',
            encodeParameters(['uint256', 'address', 'bool'], ['100', this.lp2.address, false]), eta, { from: bob },
        );
        await time.increase(time.duration.days(4));
        await this.timelock.executeTransaction(
            this.chef.address, '0', 'set(uint256,uint256,bool)',
            encodeParameters(['uint256', 'uint256', 'bool'], ['0', '200', false]), eta, { from: bob },
        );
        await this.timelock.executeTransaction(
            this.chef.address, '0', 'add(uint256,address,bool)',
            encodeParameters(['uint256', 'address', 'bool'], ['100', this.lp2.address, false]), eta, { from: bob },
        );
        assert.equal((await this.chef.poolInfo('0')).valueOf().allocPoint, '200');
        assert.equal((await this.chef.totalAllocPoint()).valueOf(), '300');
        assert.equal((await this.chef.poolLength()).valueOf(), '2');
    });
});
