export class SnowflakeGenerator {
  private sequence = 0;
  private lastTimestamp = -1;
  private readonly epochMs: number;
  private readonly instanceId: number;

  constructor(epochMs: number, instanceId: number) {
    this.epochMs = epochMs;
    this.instanceId = instanceId;
  }

  next(nowMs = Date.now()): string {
    if (nowMs < this.lastTimestamp) {
      this.sequence = 0;
    }

    if (nowMs === this.lastTimestamp) {
      this.sequence = (this.sequence + 1) & 0xfff;
    } else {
      this.sequence = 0;
      this.lastTimestamp = nowMs;
    }

    const timestampPart = BigInt(nowMs - this.epochMs) << 22n;
    const instancePart = BigInt(this.instanceId & 0x3ff) << 12n;
    const sequencePart = BigInt(this.sequence);

    return (timestampPart | instancePart | sequencePart).toString();
  }
}
