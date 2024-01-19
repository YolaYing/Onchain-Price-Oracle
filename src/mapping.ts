//@ts-ignore
import { Bytes, Block, Event, BigInt} from "@hyperoracle/zkgraph-lib";

// this address is the test USDT contract address on sepolia testnet
var contract_address = Bytes.fromHexString(
  "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06"
);

// this is the event signature of the transfer event
var esig_trasfer = Bytes.fromHexString(
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
);


class PriceOracle {
  /**
   * Stores the prices and timestamps from the events
   * @param prices - The prices from the events
   * @param timestamps - The timestamps from the events
   */

  private prices: BigInt[] = [];
  private timestamps: BigInt[] = [];
  // this is used to generate random timestamp, when zkgraph supports reading timestamp from events, we can remove this
  private lastTimestamp: BigInt = BigInt.fromI32(0);

  updatePrice(syncEvent: Event): void {
    //value is in data
    let price = syncEvent.data; 
    // it seems that zkgraph does not support listening to multiple blocks yet, so we cannot get the real timestamp
    // so we cannot use the following code to get dummy timestamp just for demo
    let timestamp = this.lastTimestamp.plus(1000);
    this.lastTimestamp = timestamp;

    this.prices.push(BigInt.fromBytes(price));
    this.timestamps.push(timestamp);
  }

  calculateTWAP(): BigInt {

    if (this.prices.length === 0) {
      throw new Error("No prices available");
    }
    
    if (this.prices.length === 1) {
      return this.prices[0];
    }

    if (this.prices.length === 2) {
      
      let timeDiff = BigInt.from(this.timestamps[1].minus(this.timestamps[0]));
      let weightedPrice = this.prices[0].times(timeDiff);
      return weightedPrice.div(timeDiff);
    }

    let totalWeightedPrice = BigInt.from(0);
    let totalTimeWeight = BigInt.from(0);

    // calculate the weighted average price
    for (let i = 0; i < this.prices.length - 1; i++) {
      let timeDiff = BigInt.from(this.timestamps[i + 1].minus(this.timestamps[i]));
      let weightedPrice = this.prices[i].times(timeDiff);
      totalWeightedPrice = totalWeightedPrice.plus(weightedPrice);
      totalTimeWeight = totalTimeWeight.plus(timeDiff);
    }
    return totalWeightedPrice.div(totalTimeWeight);
  }
}

export function handleBlocks(blocks: Block[]): Bytes {

  let events = blocks[0].events;
  let oracle: PriceOracle = new PriceOracle();
  
  // Loop through all events and update the oracle with the transfer events
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].address == contract_address && events[i].esig == esig_trasfer) {
      oracle.updatePrice(events[i]);
    }
  }

  // Calculate the TWAP
  let twap = oracle.calculateTWAP();
  Bytes.fromHexString(twap.toString(16))
  let output = Bytes.fromHexString(twap.toString(16));
  return output;
}