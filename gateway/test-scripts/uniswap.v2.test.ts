import { request, ethTests } from './ethereum.test.base';
import 'jest-extended';

// constants
const TOKENS = ['WETH', 'DAI', 'ETH'];
const AMOUNT_PRICE = 1;
const AMOUNT_TRADE = 0.01;
const SCALE_FACTOR = 1000;

jest.setTimeout(300000); // run for 5 mins

export const unitTests = async () => {
  test('ethereum routes', async () => {
    await ethTests('uniswap', TOKENS);
    console.log('\nStarting Uniswap tests');
    console.log('***************************************************');
    // call /
    const pair = `${TOKENS[0]}-${TOKENS[1]}`;
    console.log(`Starting Uniswap v2 on pair ${pair}...`);
    const root = await request('GET', '/eth/uniswap/');
    console.log(root);

    // price buy
    console.log(`Checking buy price for ${pair}...`);
    const buyPrice = await request('POST', '/eth/uniswap/price', {
      base: TOKENS[0],
      quote: TOKENS[1],
      amount: AMOUNT_PRICE.toString(),
      side: 'BUY',
    });
    console.log(`Buy price: ${buyPrice.price}`);

    // price sell
    console.log(`Checking sell price for ${pair}...`);
    const sellPrice = await request('POST', '/eth/uniswap/price', {
      base: TOKENS[0],
      quote: TOKENS[1],
      amount: AMOUNT_PRICE.toString(),
      side: 'SELL',
    });
    console.log(`Sell price: ${sellPrice.price}`);

    // trade buy
    console.log(
      `Executing buy trade on ${pair} with ${AMOUNT_TRADE} amount...`
    );
    const buy = await request('POST', '/eth/uniswap/trade', {
      base: TOKENS[0],
      quote: TOKENS[1],
      amount: AMOUNT_TRADE.toString(),
      side: 'BUY',
    });
    expect(buy.hash).toBeDefined();
    console.log(`Buy hash - ${buy.hash}`);
    let done = false;
    let tx1, tx2;
    console.log(`Polling...`);
    while (!done) {
      tx1 = await request('POST', '/eth/poll', { txHash: buy.hash });
      console.log(tx1);
      done = tx1.confirmed;
    }
    expect(tx1.receipt.status).toEqual(1);

    done = false;

    // trade sell
    console.log(
      `Executing sell trade on ${pair} with ${AMOUNT_TRADE} amount...`
    );
    const sell = await request('POST', '/eth/uniswap/trade', {
      base: TOKENS[0],
      quote: TOKENS[1],
      amount: AMOUNT_TRADE.toString(),
      side: 'SELL',
    });
    expect(sell.hash).toBeDefined();
    console.log(`Buy hash - ${sell.hash}`);
    console.log(`Polling...`);
    while (!done) {
      tx2 = await request('POST', '/eth/poll', { txHash: sell.hash });
      console.log(tx2);
      done = tx2.confirmed;
    }
    expect(tx2.receipt.status).toEqual(1);

    // add tests for extreme values of limitPrice - buy and sell
    console.log(
      `Testing for failure with ${
        buyPrice.price / SCALE_FACTOR
      } buy limitPrice...`
    );
    expect(
      await request('POST', '/eth/uniswap/trade', {
        base: TOKENS[0],
        quote: TOKENS[1],
        amount: '1',
        side: 'BUY',
        limitPrice: buyPrice.price / SCALE_FACTOR,
      })
    ).toBeUndefined();

    // add tests for extreme values of minimumSlippage
    console.log(
      `Testing for failure with ${
        sellPrice.price * SCALE_FACTOR
      } sell limitPrice...`
    );
    expect(
      await request('POST', '/eth/uniswap/trade', {
        base: TOKENS[0],
        quote: TOKENS[1],
        amount: '1',
        side: 'SELL',
        limitPrice: sellPrice.price * SCALE_FACTOR,
      })
    ).toBeUndefined();
  });
};

(async () => {
  await unitTests();
})();
