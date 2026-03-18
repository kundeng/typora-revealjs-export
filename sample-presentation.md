---
revealjs-theme: white
revealjs-transition: slide
revealjs-slideNumber: true
---

# Building Microservices

## A Practical Architecture Guide

---

## Why Microservices?

Monoliths work — until they don't. As teams grow, a single codebase becomes a bottleneck for deployment velocity, fault isolation, and independent scaling.

Key drivers for decomposition:

- **Team autonomy** — each squad owns a service end-to-end
- **Independent deployability** — ship without coordinating 20 teams
- **Technology heterogeneity** — pick the right tool per domain

---

## Service Boundaries

> The single most important decision in microservices is where to draw the lines.

Good boundaries follow **business capabilities**, not technical layers:

| Approach | Example | Risk |
|---|---|---|
| By entity | `UserService`, `OrderService` | Anemic services |
| By capability | `Checkout`, `Inventory` | Better cohesion |
| By subdomain | Bounded Contexts (DDD) | Best long-term fit |

---

## Communication Patterns

### Synchronous — REST / gRPC

```python
import httpx

async def get_inventory(product_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"http://inventory-svc/api/v1/products/{product_id}"
        )
        resp.raise_for_status()
        return resp.json()
```

### Asynchronous — Event-Driven

```python
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers='kafka:9092',
    value_serializer=lambda v: json.dumps(v).encode()
)

producer.send('order-events', {
    'type': 'OrderPlaced',
    'order_id': '12345',
    'items': [{'sku': 'WIDGET-01', 'qty': 3}]
})
```

---

## Observability Stack

You can't debug what you can't see. Three pillars:

1. **Logs** — structured JSON, correlated by `trace_id`
2. **Metrics** — RED method (Rate, Errors, Duration)
3. **Traces** — distributed tracing with OpenTelemetry

```yaml
# docker-compose snippet
services:
  jaeger:
    image: jaegertracing/all-in-one:1.54
    ports:
      - "16686:16686"   # UI
      - "4317:4317"     # OTLP gRPC
```

---

## Math Example

For load balancing with consistent hashing, the probability of a key moving when a node is added to $n$ nodes:

$$P(\text{remap}) = \frac{1}{n+1}$$

Expected number of keys remapped from $K$ total:

$$E[\text{moved}] = \frac{K}{n+1}$$

---

## Key Takeaways

1. Start with a modular monolith — extract later
2. Boundaries should follow business domains
3. Prefer async communication where latency allows
4. Invest in observability **before** you need it
5. Automate everything: CI/CD, infra, testing

> Note: Remind the audience about the architecture decision records (ADRs) template we shared last quarter.

---

## Thank You

Questions?

*github.com/your-org/microservices-guide*
