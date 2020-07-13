/*
    Copyright (c) 2020, Cameron Hamilton-Rich

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted, provided that the above
    copyright notice and this permission notice appear in all copies.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
    WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
    MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
    ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
    WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
    ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
    OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

    note: Copy env to .env and update the private key to your account.
   
    borrow.js

    Borrow some dai from Aave
*/
const Web3 = require('web3');
const dotenv = require('dotenv').config();

const url = process.env.URL;
console.log("url: " + url);
const web3 = new Web3(url);

// ABI imports
const ERC20ABI = require('./ABIs/ERC20.json');
const LendingPoolAddressProviderABI = require('./ABIs/AddressProvider.json');
const LendingPoolABI = require('./ABIs/LendingPool.json');

const daiAmountinWei = web3.utils.toWei("5", "ether").toString(); // amount in DAI
const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';
const lpAddressProviderAddress = "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8";
const lpAddressProviderContract = new web3.eth.Contract(LendingPoolAddressProviderABI, lpAddressProviderAddress);
const interestRateMode = 2; // variable rate
const referralCode = "0";

const init = async () => {
    async function getLendingPoolAddress() {
        const lpAddress = await lpAddressProviderContract.methods
              .getLendingPool()
              .call()
              .catch((e) => {
                throw Error(`Error getting lendingPool address: ${e.message}`)
              });
        console.log("LendingPool address: " + lpAddress);
        return lpAddress
    }

    async function getLendingPoolCoreAddress() {
        const lpCoreAddress = await lpAddressProviderContract.methods.getLendingPoolCore()
          .call()
          .catch((e) => {
            throw Error(`Error getting lendingPool address: ${e.message}`)
          });

        console.log("LendingPoolCore address: " + lpCoreAddress)
        return lpCoreAddress
    }

    const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    const myAccount = account.address;
    console.log("account: " + myAccount);
    const lpCoreAddress = await getLendingPoolCoreAddress();
    const gasPrice = await web3.eth.getGasPrice();

    // work out our current balance
    const daiContract = new web3.eth.Contract(ERC20ABI, daiAddress);
    let balance = await daiContract.methods.balanceOf(myAccount).call();
    console.log("initial balance: " + web3.utils.fromWei(balance, 'ether'));

    // Approve the LendingPoolCore address with the DAI contract
    let approve = daiContract.methods.approve(lpCoreAddress, daiAmountinWei);
    await approve.send({ 
            from: myAccount,
            gasLimit: web3.utils.toHex(60000),
            gasPrice
        })
        .catch((e) => {
          throw Error(`Error approving DAI allowance: ${e.message}`)
        });

    // The borrow transaction via LendingPool contract
    const lpAddress = await getLendingPoolAddress();
    const lpContract = new web3.eth.Contract(LendingPoolABI, lpAddress);
    const borrow = lpContract.methods.borrow(
            daiAddress, daiAmountinWei, interestRateMode, referralCode);
    await borrow.send({ 
            from: myAccount, 
            gasLimit: web3.utils.toHex(600000),
            gasPrice
        })
        .catch((e) => { throw Error(`Error borrowing from the LendingPool contract: ${e.message}`); });

    // display the final balance
    balance = await daiContract.methods.balanceOf(myAccount).call()
                .catch(e => { throw Error('Error getting balance: ' + e.message); });
    console.log("final balance: " + web3.utils.fromWei(balance, 'ether'))
    console.log("success!");
}

init();
