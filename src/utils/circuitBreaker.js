const STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
};

class CircuitBreaker {
  constructor() {
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.failureThreshold = 3;
    this.recoveryTimeout = 10000; // 10 seconds
    this.lastFailureTime = null;
  }

  isOpen() {
    if (this.state === STATES.OPEN) {
      const now = Date.now();
      const timeSinceFailure = now - this.lastFailureTime;

      if (timeSinceFailure > this.recoveryTimeout) {
        console.log('Circuit Breaker → HALF_OPEN');
        this.state = STATES.HALF_OPEN;
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = STATES.CLOSED;
    console.log('Circuit Breaker → CLOSED');
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = STATES.OPEN;
      console.log('Circuit Breaker → OPEN (Redis down!)');
    }
  }
}

module.exports = new CircuitBreaker();