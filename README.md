# AAVE Borrow Tutorial

An Aave tutorial that can deposit/borrow using a forked mainnet using ETH/DAI/aDAI.

The code can be downloaded from https://github.com/cryptocamtech/aave-borrow-tutorial.

The tutorial associated with this code: https://cryptocam.tech/2020/06/29/aave-deposit-borrowing-tutorial-part-i/

Preparation:
```
    cp env .env  
    // update variables in .env as appropriate  
    npm update
    chmod a+x fork_main.sh
```

And run
```
    ./fork_main.sh 
    node ethToDai.js
    node deposit.js
    node borrow.js
```
