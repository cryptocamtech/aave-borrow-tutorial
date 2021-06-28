/*
    Copyright (c) 2021, Cameron Hamilton-Rich

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

    ethToDai.js

    Exchange some eth for dai on Uniswap
*/
require('dotenv').config();
const Web3 = require('web3');
const Tx = require('ethereumjs-tx').Transaction;

const url = process.env.URL;
console.log("url: " + url);
const web3 = new Web3(url);

// ABI imports
const uniswapV1ExchangeAddress = '0x2a1530C4C41db0B0b2bB646CB5Eb1A67b7158667'; 
const uniswapV1ExchangeABI = require('./ABIs/uniswapv1.json');
const daiAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';
const daiABI = require('./ABIs/DAI.json');

// create the contracts
const uniswapExchangeContract = new web3.eth.Contract(uniswapV1ExchangeABI, uniswapV1ExchangeAddress);
const daiContract = new web3.eth.Contract(daiABI, daiAddress);

// declare const variables to pass to the ethToTokenSwapInput function of the dai exchange contract
const ETH_SOLD = web3.utils.toHex(web3.utils.toWei('1', 'ether')); 
const MIN_TOKENS = web3.utils.toHex(200 * 10 ** 18);
const DEADLINE = Math.floor(new Date() / 1000) + 10;

const init = async () => {
    // get our account
    const myAccount = process.env.ACCOUNT;
    console.log("myAccount: " + myAccount);

    // create the encoded abi of the ethToTokenSwapInput function
    const exchangeEncodedABI = uniswapExchangeContract.methods
      .ethToTokenSwapInput(MIN_TOKENS, DEADLINE)
      .encodeABI();

    // work out our current balance
    let balance = await daiContract.methods.balanceOf(myAccount).call();
    console.log("initial balance: " + web3.utils.fromWei(balance, 'ether'));

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
    console.log("final balance: " + web3.utils.fromWei(balance, 'ether'))
    console.log("success!");
}

init();
