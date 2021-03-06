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

    deposit.js

    Deposit some dai into Aave
*/
require('dotenv').config();
const Web3 = require('web3');

const url = process.env.URL;
console.log("url: " + url);
const web3 = new Web3(url);

// ABI imports
const ERC20ABI = require('./ABIs/ERC20.json');
const LendingPoolAddressProviderABI = require('./ABIs/AddressProvider.json');
const LendingPoolABI = require('./ABIs/LendingPool.json');

// amount of DAI (not ETH)
const daiAmountinWei = web3.utils.toWei("10", "ether").toString(); 
const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';
const lpAddressProviderAddress = "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8";
const lpAddressProviderContract = new web3.eth.Contract(LendingPoolAddressProviderABI, lpAddressProviderAddress);
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

    // import the account via the private key
    const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);
    const myAccount = account.address;
    console.log("account: " + myAccount);
    const lpCoreAddress = await getLendingPoolCoreAddress();

    // Approve the LendingPoolCore address with the DAI contract
    const daiContract = new web3.eth.Contract(ERC20ABI, daiAddress);

    let approve = daiContract.methods.approve(lpCoreAddress, daiAmountinWei);
    const gasPrice = await web3.eth.getGasPrice();

    await approve.send({ 
            from: myAccount,
            gasLimit: web3.utils.toHex(60000),
            gasPrice
        })
        .catch((e) => { throw Error(`Error approving DAI allowance: ${e.message}`) });

    // Make the deposit transaction via LendingPool contract
    const lpAddress = await getLendingPoolAddress();
    const lpContract = new web3.eth.Contract(LendingPoolABI, lpAddress);
    const deposit = lpContract.methods.deposit(
            daiAddress, daiAmountinWei, referralCode);
    await deposit.send({ 
            from: myAccount, 
            gasLimit: web3.utils.toHex(250000),
            gasPrice
        })
        .catch((e) => { throw Error(`Error depositing to the LendingPool contract: ${e.message}`); });
    console.log("success!");
}

init();
