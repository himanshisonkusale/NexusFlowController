# 🛡️ NexusFlowController

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-00ff88?style=for-the-badge)
![Node](https://img.shields.io/badge/node-18+-00ff88?style=for-the-badge&logo=node.js)
![Redis](https://img.shields.io/badge/redis-7.0+-red?style=for-the-badge&logo=redis)
![Docker](https://img.shields.io/badge/docker-ready-blue?style=for-the-badge&logo=docker)

**A production-grade distributed rate-limiting and traffic-shaping system**

*Handling 471+ RPS with sub-12ms p95 latency across a 3-node cluster*

</div>

---

## 🎯 Problem Statement

Modern microservice architectures face critical stability risks from unpredictable traffic patterns. Flash sales, DDoS attacks, and misconfigured retry loops can overwhelm backend services, causing:

- 💥 Cascading failures across services
- 🧵 Thread pool exhaustion
- 🗄️ Database bottlenecks
- 💸 Massive cloud bills

**NexusFlowController** solves this by acting as an intelligent infrastructure layer that intercepts, evaluates, and controls every incoming request — before it ever reaches your business logic.

---

## 🏗️ System Architecture

```
[ Client Traffic — Browser / k6 Load Tester ]
                      │
                      ▼
          [ Nginx Load Balancer :80 ]
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
  [ Node 1 ]     [ Node 2 ]     [ Node 3 ]
  Express.js     Express.js     Express.js
       │              │              │
       └──────────────┼──────────────┘
                      │
            [ Redis :6379 ]
            Atomic Lua Scripts
            Shared State
                      │
                      ▼
         [ Prometheus :9090 ]
                      │
                      ▼
          [ Grafana Dashboard :4000 ]
```

---

## ⚡ Performance Benchmarks

| Metric | Single Node | 3-Node Cluster |
|--------|------------|----------------|
| RPS | 435 | **471** |
| p90 Latency | 28.3ms | **9.6ms** |
| p95 Latency | 38.27ms | **11.58ms** |
| Concurrent Users | 100 | 100 |
| Total Requests | 39,172 | 42,470 |

> *Benchmarked using k6 load testing tool with 100 concurrent virtual users*

---

## 🔥 Key Features

### 1. Atomic Redis Lua Scripts
Eliminates race conditions completely. `INCR` and `EXPIRE` operations execute as a single atomic unit — no dirty reads possible.

```lua
local current = redis.call('INCR', key)
if current == 1 then
  redis.call('EXPIRE', key, windowSize)
end
if current > maxRequests then
  local ttl = redis.call('TTL', key)
  return {0, ttl}
end
return {1, -1}
```

### 2. Circuit Breaker Pattern
Three-state fault tolerance system inspired by Netflix Hystrix:

```
CLOSED ──────────────────────────────────────────────────────────►
  │  Normal operation, Redis healthy                              │
  │  (3 consecutive failures)                                     │
  ▼                                                               │
OPEN                                                              │
  │  Redis down, fail-open strategy activated                     │
  │  All requests allowed through                                 │
  │  (after 10 seconds)                                           │
  ▼                                                               │
HALF-OPEN ──────────────────────────────────────────────────────►
     Testing recovery — if success, back to CLOSED
```

### 3. JWT Tier-Based Rate Limiting

| Tier | Limit | Use Case |
|------|-------|----------|
| Anonymous | 5 req/min | Public API access |
| Premium | 100 req/min | Paid tier access |

### 4. 3-Node Distributed Cluster
Nginx distributes traffic across 3 Express nodes via round-robin load balancing. All nodes share a single Redis instance — rate limits are globally accurate across the entire cluster.

### 5. Live React Observability Dashboard
Real-time dashboard with:
- 🟢 Node health monitoring (UP/DOWN per node)
- 📈 Live area traffic graph (allowed vs blocked)
- 📊 Block rate percentage
- 🧪 Interactive request tester with tier switching
- ⚡ Auto-refreshes every 2 seconds

---

## 📁 Project Structure

```
NexusFlowController/
├── src/
│   ├── server.js                 # Express server
│   ├── middleware/
│   │   └── rateLimiter.js        # Core rate limiting logic
│   └── utils/
│       ├── circuitBreaker.js     # Circuit breaker implementation
│       ├── metrics.js            # Prometheus metrics
│       └── tierConfig.js        # Tier configuration
├── dashboard/                    # React live dashboard
│   └── src/
│       └── App.js
├── docker-compose.yml            # Container orchestration
├── Dockerfile                    # Node.js container config
├── nginx.conf                    # Load balancer config
├── prometheus.yml                # Metrics scraping config
└── load-test.js                  # k6 load test script
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | Node.js + Express | API server |
| Cache | Redis | Shared state + atomic operations |
| Proxy | Nginx | Load balancing (round-robin) |
| Metrics | Prometheus | Time-series data collection |
| Monitoring | Grafana | Production monitoring dashboard |
| Frontend | React + Recharts | Live observability dashboard |
| Testing | k6 | Load benchmarking |
| Infra | Docker Compose | Container orchestration |

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop
- Node.js v18+
- k6 (for load testing)

### Run the System

```bash
# 1. Clone the repository
git clone https://github.com/himanshisonkusale/NexusFlowController.git
cd NexusFlowController

# 2. Start all backend services
docker-compose up --build -d

# 3. Start the live dashboard
cd dashboard
npm install
npm start
```

### Verify Everything is Running

| Service | URL | Description |
|---------|-----|-------------|
| API | http://localhost:8080/api/data | Main rate-limited endpoint |
| Dashboard | http://localhost:5000 | Live React dashboard |
| Prometheus | http://localhost:9090 | Metrics collector |
| Grafana | http://localhost:4000 | Monitoring graphs |
| Node 1 Health | http://localhost:8081/health | Node 1 status |
| Node 2 Health | http://localhost:8082/health | Node 2 status |
| Node 3 Health | http://localhost:8083/health | Node 3 status |

---

## 🧪 Testing

### Generate JWT Token
```bash
curl -X POST http://localhost:8080/token \
  -H "Content-Type: application/json" \
  -d '{"tier": "premium"}'
```

### Test Rate Limiting
```bash
# Anonymous — blocked after 5 requests
curl http://localhost:8080/api/data

# Premium — 100 requests allowed per minute
curl http://localhost:8080/api/data \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Load Testing with k6
```bash
k6 run load-test.js
```

### Chaos Testing — Kill a Node
```bash
# Kill Node 2 — watch dashboard turn RED instantly
docker stop nexus-node2

# Recover Node 2 — watch dashboard turn GREEN
docker start nexus-node2
```

---

## 📊 Rate Limits

```
Anonymous User  →   5 requests / minute
Premium User    →  100 requests / minute
```

Limits are enforced globally across all 3 nodes via shared Redis state. A user cannot bypass the limit by hitting different nodes.

---

## 🔍 API Reference

| Method | Endpoint | Auth Required | Description |
|--------|----------|--------------|-------------|
| GET | /api/data | No | Main rate-limited endpoint |
| POST | /token | No | Generate JWT token |
| GET | /health | No | Node health check |
| GET | /metrics | No | Prometheus metrics endpoint |

---

## 📈 Monitoring Setup

### Grafana Dashboard
1. Open http://localhost:4000
2. Login: `admin` / `admin`
3. Go to Connections → Data Sources → Add Prometheus
4. URL: `http://prometheus:9090`
5. Save & Test

### Key Prometheus Queries
```promql
# Total requests by status
http_requests_total

# Only blocked requests
http_requests_total{status="blocked"}

# Request rate per second
rate(http_requests_total[1m])

# p95 latency
histogram_quantile(0.95, http_request_duration_ms_bucket)
```

---

## 🎓 Engineering Concepts Demonstrated

| Concept | Implementation |
|---------|---------------|
| Distributed Systems | 3-node cluster with Nginx load balancer |
| Race Condition Prevention | Atomic Lua scripts in Redis |
| Fault Tolerance | Circuit Breaker (CLOSED/OPEN/HALF-OPEN) |
| Observability | Prometheus metrics + Grafana + React dashboard |
| Load Balancing | Nginx round-robin distribution |
| Multi-Tenancy | JWT-based tier detection (Anonymous/Premium) |
| Containerization | Docker Compose orchestration |
| Performance Engineering | k6 load benchmarking with p95/p99 metrics |
| Graceful Degradation | Fail-open strategy when Redis is unavailable |

---

---

<div align="center">

### 👩‍💻 Built by [Himanshi Sonkusale](https://github.com/himanshisonkusale)

[![GitHub](https://img.shields.io/badge/GitHub-himanshisonkusale-00ff88?style=for-the-badge&logo=github&logoColor=white)](https://github.com/himanshisonkusale)

*471 RPS • p95 11.58ms • 3-Node Cluster • Circuit Breaker • Live Dashboard*

⚡ Real engineering. Real benchmarks. Real learning.


</div>