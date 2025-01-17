const { expectRevert } = require('@openzeppelin/test-helpers');
const VodkaToken = artifacts.require('VodkaToken');

contract('VodkaToken', ([alice, bob, carol]) => {
    beforeEach(async () => {
        this.vodka = await VodkaToken.new({ from: alice });
    });

    it('should have correct name and symbol and decimal', async () => {
        const name = await this.vodka.name();
        const symbol = await this.vodka.symbol();
        const decimals = await this.vodka.decimals();
        assert.equal(name.valueOf(), 'VodkaToken');
        assert.equal(symbol.valueOf(), 'VODKA');
        assert.equal(decimals.valueOf(), '18');
    });

    it('should only allow owner to mint token', async () => {
        await this.vodka.mint(alice, '100', { from: alice });
        await this.vodka.mint(bob, '1000', { from: alice });
        await expectRevert(
            this.vodka.mint(carol, '1000', { from: bob }),
            'Ownable: caller is not the owner',
        );
        const totalSupply = await this.vodka.totalSupply();
        const aliceBal = await this.vodka.balanceOf(alice);
        const bobBal = await this.vodka.balanceOf(bob);
        const carolBal = await this.vodka.balanceOf(carol);
        assert.equal(totalSupply.valueOf(), '1100');
        assert.equal(aliceBal.valueOf(), '100');
        assert.equal(bobBal.valueOf(), '1000');
        assert.equal(carolBal.valueOf(), '0');
    });

    it('should supply token transfers properly', async () => {
        await this.vodka.mint(alice, '100', { from: alice });
        await this.vodka.mint(bob, '1000', { from: alice });
        await this.vodka.transfer(carol, '10', { from: alice });
        await this.vodka.transfer(carol, '100', { from: bob });
        const totalSupply = await this.vodka.totalSupply();
        const aliceBal = await this.vodka.balanceOf(alice);
        const bobBal = await this.vodka.balanceOf(bob);
        const carolBal = await this.vodka.balanceOf(carol);
        assert.equal(totalSupply.valueOf(), '1100');
        assert.equal(aliceBal.valueOf(), '90');
        assert.equal(bobBal.valueOf(), '900');
        assert.equal(carolBal.valueOf(), '110');
    });

    it('should fail if you try to do bad transfers', async () => {
        await this.vodka.mint(alice, '100', { from: alice });
        await expectRevert(
            this.vodka.transfer(carol, '110', { from: alice }),
            'ERC20: transfer amount exceeds balance',
        );
        await expectRevert(
            this.vodka.transfer(carol, '1', { from: bob }),
            'ERC20: transfer amount exceeds balance',
        );
    });
  });
