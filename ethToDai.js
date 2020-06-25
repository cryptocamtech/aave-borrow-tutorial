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
          Also works on the Rinkeby network if you are using that.
 
    ethToDai.js
*/
const Tx = require('ethereumjs-tx').Transaction;
const Web3 = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const dotenv = require('dotenv').config();
const fs = require('fs');

// read the private key and put it into the wallet
console.log("URL: " + process.env.URL);
const provider = new HDWalletProvider(process.env.PRIVATE_KEY, process.env.URL);
const web3 = new Web3(provider); 

// ABI imports
const uniswapV1ExchangeAddress = process.env.UNISWAP_EXCHANGE_ADDRESS; 
const uniswapV1ExchangeABI = JSON.parse(fs.readFileSync('./ABIs/uniswapv1.json'));
const daiAddress = process.env.DAI_ADDRESS;
const daiABI = JSON.parse(fs.readFileSync('./ABIs/DAI.json'));

// create the contracts
const uniswapExchangeContract = new web3.eth.Contract(uniswapV1ExchangeABI, uniswapV1ExchangeAddress);
const daiContract = new web3.eth.Contract(daiABI, daiAddress);

const ETHER_TO_USE = 1;
const MIN_DAI_TO_SWAP = 1; // note: exchange rate on Rinkeby isn't right, so fails if you put in "proper" values
const ETH_SOLD = web3.utils.toHex(web3.utils.toWei(ETHER_TO_USE.toString(), 'ether')); 

// declare const variables to pass to the ethToTokenSwapInput function of the dai exchange contract
const MIN_TOKENS = web3.utils.toHex(MIN_DAI_TO_SWAP * 10 ** 18);
const DEADLINE = Math.floor(new Date() / 1000) + 3600; // now plus 1 hour

(async () => {
    // get our account
    const accounts = await web3.eth.getAccounts();
    const myAccount = accounts[0];
    console.log("myAccount: " + myAccount);

    // create the encoded abi of the ethToTokenSwapInput function
    const exchangeEncodedABI = uniswapExchangeContract.methods
      .ethToTokenSwapInput(MIN_TOKENS, DEADLINE)
      .encodeABI();

    // work out our current balance
    let balance = await daiContract.methods.balanceOf(myAccount).call();
    console.log("initial balance: " + balance);

    // construct a transaction object and invoke the sendSignedTx function
    const txCount = await web3.eth.getTransactionCount(myAccount);
    const txObject = {
        nonce: web3.utils.toHex(txCount),
        gasLimit: web3.utils.toHex(60000),
        gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
        to: uniswapV1ExchangeAddress,
        from: myAccount,
        data: exchangeEncodedABI,
        value: ETH_SOLD
    };

    const tx = new Tx(txObject);
    const privateKey = new Buffer.from(process.env.PRIVATE_KEY, "hex");
    tx.sign(privateKey);
    const serializedEthTx = tx.serialize().toString("hex");
    const txHash = await web3.eth.sendSignedTransaction(`0x${serializedEthTx}`)
                .catch(e => { throw Error('Error sending transaction: ' + e.message); });
    console.log('txHash: ' + txHash.transactionHash);

    // display the final balance
    balance = await daiContract.methods.balanceOf(myAccount).call()
                .catch(e => { throw Error('Error getting balance: ' + e.message); });
    console.log("final balance: " + balance)
    console.log("success!");
})()
.then(() => process.exit())
.catch(e => {
    console.log(e.message)
});
