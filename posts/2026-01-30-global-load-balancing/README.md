# How to Build Global Load Balancing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Load Balancing, Global, Multi-Region, CDN

Description: Learn how to implement global load balancing for geographic traffic distribution.

---

Users expect fast responses regardless of their location. A server in Virginia responds slowly to users in Tokyo. Global load balancing solves this by routing traffic to the nearest healthy endpoint, reducing latency and improving reliability.

## What is Global Load Balancing?

Global load balancing distributes traffic across multiple geographic regions. Unlike traditional load balancers that operate within a single data center, global load balancers make routing decisions based on user location, server health, and network conditions.

```mermaid
flowchart TB
    subgraph Users
        US[US Users]
        EU[EU Users]
        APAC[APAC Users]
    end

    subgraph Global Load Balancer
        GLB[DNS/Anycast Router]
    end

    subgraph Regions
        subgraph US-East
            LB1[Regional LB]
            S1[Servers]
        end
        subgraph EU-West
            LB2[Regional LB]
            S2[Servers]
        end
        subgraph AP-Tokyo
            LB3[Regional LB]
            S3[Servers]
        end
    end

    US --> GLB
    EU --> GLB
    APAC --> GLB

    GLB -->|Nearest| LB1
    GLB -->|Nearest| LB2
    GLB -->|Nearest| LB3

    LB1 --> S1
    LB2 --> S2
    LB3 --> S3
```

## Core Technologies

### GeoDNS

GeoDNS returns different IP addresses based on the geographic location of the DNS resolver. When a user in Germany queries your domain, GeoDNS returns the IP of your Frankfurt server. A user in California gets the IP of your US West server.

```mermaid
sequenceDiagram
    participant User as User (Berlin)
    participant Resolver as DNS Resolver
    participant GeoDNS as GeoDNS Server
    participant EU as EU Server
    participant US as US Server

    User->>Resolver: api.example.com?
    Resolver->>GeoDNS: api.example.com?
    Note over GeoDNS: Detect resolver in EU
    GeoDNS->>Resolver: 52.28.x.x (Frankfurt)
    Resolver->>User: 52.28.x.x
    User->>EU: HTTPS Request
    EU->>User: Response (20ms latency)
```

### Anycast

Anycast advertises the same IP address from multiple locations. Network routing automatically sends packets to the nearest server. This works at the IP layer, making it faster than DNS-based approaches.

```mermaid
flowchart LR
    subgraph Internet
        User1[User NYC]
        User2[User London]
        User3[User Sydney]
    end

    subgraph Anycast IP: 192.0.2.1
        POP1[NYC PoP]
        POP2[London PoP]
        POP3[Sydney PoP]
    end

    User1 -->|BGP Routing| POP1
    User2 -->|BGP Routing| POP2
    User3 -->|BGP Routing| POP3
```

### Latency-Based Routing

Latency-based routing measures actual network latency between users and servers, routing to the endpoint with the lowest latency. This handles cases where geographic proximity does not equal network proximity.

## AWS Route 53 Implementation

### GeoDNS with Route 53

```hcl
# terraform/route53_geolocation.tf
# Geographic routing policy for multi-region deployment

# Health check for US East region
resource "aws_route53_health_check" "us_east" {
  # IP address of the US East load balancer
  ip_address        = aws_lb.us_east.dns_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"

  # Check every 30 seconds
  request_interval  = 30

  # Mark unhealthy after 3 consecutive failures
  failure_threshold = 3

  tags = {
    Name = "us-east-health-check"
  }
}

# Health check for EU West region
resource "aws_route53_health_check" "eu_west" {
  ip_address        = aws_lb.eu_west.dns_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  request_interval  = 30
  failure_threshold = 3

  tags = {
    Name = "eu-west-health-check"
  }
}

# Health check for AP Northeast region
resource "aws_route53_health_check" "ap_northeast" {
  ip_address        = aws_lb.ap_northeast.dns_name
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  request_interval  = 30
  failure_threshold = 3

  tags = {
    Name = "ap-northeast-health-check"
  }
}

# Geolocation record for North America
resource "aws_route53_record" "api_us" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  # Geolocation routing policy
  geolocation_routing_policy {
    continent = "NA"  # North America
  }

  # Unique identifier for this record
  set_identifier = "us-east"

  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true
  }

  # Associate with health check
  health_check_id = aws_route53_health_check.us_east.id
}

# Geolocation record for Europe
resource "aws_route53_record" "api_eu" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  geolocation_routing_policy {
    continent = "EU"  # Europe
  }

  set_identifier = "eu-west"

  alias {
    name                   = aws_lb.eu_west.dns_name
    zone_id                = aws_lb.eu_west.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.eu_west.id
}

# Geolocation record for Asia Pacific
resource "aws_route53_record" "api_ap" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  geolocation_routing_policy {
    continent = "AS"  # Asia
  }

  set_identifier = "ap-northeast"

  alias {
    name                   = aws_lb.ap_northeast.dns_name
    zone_id                = aws_lb.ap_northeast.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.ap_northeast.id
}

# Default record for locations not explicitly covered
resource "aws_route53_record" "api_default" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  geolocation_routing_policy {
    country = "*"  # Default/fallback
  }

  set_identifier = "default"

  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.us_east.id
}
```

### Latency-Based Routing with Route 53

```hcl
# terraform/route53_latency.tf
# Latency-based routing for optimal performance

# Latency record for US East
resource "aws_route53_record" "api_latency_us" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  # Latency routing policy
  latency_routing_policy {
    region = "us-east-1"
  }

  set_identifier = "us-east-latency"

  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.us_east.id
}

# Latency record for EU West
resource "aws_route53_record" "api_latency_eu" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  latency_routing_policy {
    region = "eu-west-1"
  }

  set_identifier = "eu-west-latency"

  alias {
    name                   = aws_lb.eu_west.dns_name
    zone_id                = aws_lb.eu_west.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.eu_west.id
}

# Latency record for AP Northeast
resource "aws_route53_record" "api_latency_ap" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  latency_routing_policy {
    region = "ap-northeast-1"
  }

  set_identifier = "ap-northeast-latency"

  alias {
    name                   = aws_lb.ap_northeast.dns_name
    zone_id                = aws_lb.ap_northeast.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.ap_northeast.id
}
```

### Failover Configuration

```hcl
# terraform/route53_failover.tf
# Primary/secondary failover for disaster recovery

# Primary record (active)
resource "aws_route53_record" "api_primary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  # Failover routing policy
  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier = "primary"

  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true
  }

  health_check_id = aws_route53_health_check.us_east.id
}

# Secondary record (standby)
resource "aws_route53_record" "api_secondary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier = "secondary"

  alias {
    name                   = aws_lb.eu_west.dns_name
    zone_id                = aws_lb.eu_west.zone_id
    evaluate_target_health = true
  }

  # Secondary can have its own health check
  health_check_id = aws_route53_health_check.eu_west.id
}
```

## Cloudflare Implementation

### Load Balancing Setup

```javascript
// cloudflare_load_balancer.js
// Configure Cloudflare Load Balancer via API

const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

// Helper function for API requests
async function cloudflareRequest(endpoint, method, body) {
  const response = await fetch(`${CLOUDFLARE_API}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return response.json();
}

// Create a health monitor
async function createHealthMonitor() {
  const monitor = await cloudflareRequest(
    `/accounts/${ACCOUNT_ID}/load_balancers/monitors`,
    'POST',
    {
      // Monitor type: HTTP, HTTPS, TCP, UDP, ICMP
      type: 'https',

      // Description for identification
      description: 'HTTPS health check for API servers',

      // HTTP method for health check
      method: 'GET',

      // Path to check
      path: '/health',

      // Expected HTTP status codes
      expected_codes: '200',

      // Check interval in seconds
      interval: 60,

      // Number of retries before marking unhealthy
      retries: 2,

      // Timeout for each check in seconds
      timeout: 5,

      // Follow redirects
      follow_redirects: true,

      // Allow insecure SSL (not recommended for production)
      allow_insecure: false,

      // Expected response body (optional)
      expected_body: '{"status":"healthy"}',

      // Custom headers for health check
      header: {
        'User-Agent': ['Cloudflare-Health-Check'],
        'Accept': ['application/json'],
      },
    }
  );

  console.log('Created monitor:', monitor.result.id);
  return monitor.result.id;
}

// Create origin pools for each region
async function createOriginPools(monitorId) {
  const regions = [
    {
      name: 'us-east-pool',
      origins: [
        {
          name: 'us-east-1',
          address: 'us-east-1.api.example.com',
          enabled: true,
          weight: 1,
        },
        {
          name: 'us-east-2',
          address: 'us-east-2.api.example.com',
          enabled: true,
          weight: 1,
        },
      ],
      // Latitude and longitude for geographic steering
      latitude: 39.0438,
      longitude: -77.4874,
    },
    {
      name: 'eu-west-pool',
      origins: [
        {
          name: 'eu-west-1',
          address: 'eu-west-1.api.example.com',
          enabled: true,
          weight: 1,
        },
        {
          name: 'eu-west-2',
          address: 'eu-west-2.api.example.com',
          enabled: true,
          weight: 1,
        },
      ],
      latitude: 53.3498,
      longitude: -6.2603,
    },
    {
      name: 'ap-tokyo-pool',
      origins: [
        {
          name: 'ap-tokyo-1',
          address: 'ap-tokyo-1.api.example.com',
          enabled: true,
          weight: 1,
        },
      ],
      latitude: 35.6762,
      longitude: 139.6503,
    },
  ];

  const poolIds = [];

  for (const region of regions) {
    const pool = await cloudflareRequest(
      `/accounts/${ACCOUNT_ID}/load_balancers/pools`,
      'POST',
      {
        name: region.name,
        origins: region.origins,

        // Associate health monitor
        monitor: monitorId,

        // Notification email for health events
        notification_email: 'oncall@example.com',

        // Minimum number of healthy origins
        minimum_origins: 1,

        // Geographic coordinates for proximity steering
        latitude: region.latitude,
        longitude: region.longitude,

        // Load balancing within the pool
        origin_steering: {
          policy: 'random',  // random, hash, least_outstanding_requests
        },

        // Check regions for origin health
        check_regions: ['WNAM', 'ENAM', 'WEU', 'EEU', 'NSAM', 'SSAM', 'OC', 'ME', 'NAF', 'SAF', 'SAS', 'SEAS', 'NEAS'],
      }
    );

    console.log(`Created pool ${region.name}:`, pool.result.id);
    poolIds.push(pool.result.id);
  }

  return poolIds;
}

// Create the load balancer with steering policy
async function createLoadBalancer(poolIds) {
  const loadBalancer = await cloudflareRequest(
    `/zones/${ZONE_ID}/load_balancers`,
    'POST',
    {
      // The hostname for the load balancer
      name: 'api.example.com',

      // Fallback pool if all others are unhealthy
      fallback_pool: poolIds[0],

      // Default pools used when no steering matches
      default_pools: poolIds,

      // Enable the load balancer
      enabled: true,

      // Proxied through Cloudflare (recommended)
      proxied: true,

      // TTL for DNS responses (only if not proxied)
      ttl: 30,

      // Steering policy: geo, dynamic_latency, proximity, random, off
      steering_policy: 'dynamic_latency',

      // Session affinity to maintain user sessions
      session_affinity: 'cookie',
      session_affinity_ttl: 1800,
      session_affinity_attributes: {
        samesite: 'Lax',
        secure: 'Auto',
        drain_duration: 60,
      },

      // Geographic steering rules (when steering_policy is 'geo')
      region_pools: {
        WNAM: [poolIds[0]],  // Western North America
        ENAM: [poolIds[0]],  // Eastern North America
        WEU: [poolIds[1]],   // Western Europe
        EEU: [poolIds[1]],   // Eastern Europe
        SEAS: [poolIds[2]],  // Southeast Asia
        NEAS: [poolIds[2]],  // Northeast Asia
        OC: [poolIds[2]],    // Oceania
      },

      // Country-specific overrides
      country_pools: {
        US: [poolIds[0]],
        CA: [poolIds[0]],
        GB: [poolIds[1]],
        DE: [poolIds[1]],
        FR: [poolIds[1]],
        JP: [poolIds[2]],
        AU: [poolIds[2]],
        SG: [poolIds[2]],
      },

      // POP-specific overrides (Cloudflare data centers)
      pop_pools: {
        LAX: [poolIds[0]],
        JFK: [poolIds[0]],
        LHR: [poolIds[1]],
        FRA: [poolIds[1]],
        NRT: [poolIds[2]],
        SYD: [poolIds[2]],
      },

      // Adaptive routing for optimal performance
      adaptive_routing: {
        failover_across_pools: true,
      },

      // Location strategy for proximity steering
      location_strategy: {
        prefer_ecs: 'always',  // Use EDNS Client Subnet when available
        mode: 'resolver_ip',   // Use resolver IP for geolocation
      },

      // Random steering weights (when steering_policy is 'random')
      random_steering: {
        default_weight: 1,
        pool_weights: {
          [poolIds[0]]: 0.5,
          [poolIds[1]]: 0.3,
          [poolIds[2]]: 0.2,
        },
      },
    }
  );

  console.log('Created load balancer:', loadBalancer.result.id);
  return loadBalancer.result;
}

// Main setup function
async function setupGlobalLoadBalancing() {
  try {
    // Step 1: Create health monitor
    const monitorId = await createHealthMonitor();

    // Step 2: Create origin pools
    const poolIds = await createOriginPools(monitorId);

    // Step 3: Create load balancer
    const loadBalancer = await createLoadBalancer(poolIds);

    console.log('Global load balancing configured successfully!');
    console.log('Load balancer hostname:', loadBalancer.name);

  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  }
}

// Run setup
setupGlobalLoadBalancing();
```

### Cloudflare Workers for Advanced Routing

```javascript
// workers/global_router.js
// Cloudflare Worker for custom routing logic

// Origin endpoints by region
const ORIGINS = {
  'us-east': 'https://us-east.api.example.com',
  'eu-west': 'https://eu-west.api.example.com',
  'ap-tokyo': 'https://ap-tokyo.api.example.com',
};

// Map Cloudflare colos to nearest origin
const COLO_TO_REGION = {
  // North America
  'ATL': 'us-east', 'BOS': 'us-east', 'CLT': 'us-east',
  'DFW': 'us-east', 'EWR': 'us-east', 'IAD': 'us-east',
  'JFK': 'us-east', 'LAX': 'us-east', 'MIA': 'us-east',
  'ORD': 'us-east', 'SEA': 'us-east', 'SFO': 'us-east',

  // Europe
  'AMS': 'eu-west', 'CDG': 'eu-west', 'DUB': 'eu-west',
  'FRA': 'eu-west', 'LHR': 'eu-west', 'MAD': 'eu-west',
  'MXP': 'eu-west', 'WAW': 'eu-west', 'ZRH': 'eu-west',

  // Asia Pacific
  'HKG': 'ap-tokyo', 'ICN': 'ap-tokyo', 'KIX': 'ap-tokyo',
  'NRT': 'ap-tokyo', 'SIN': 'ap-tokyo', 'SYD': 'ap-tokyo',
  'TPE': 'ap-tokyo', 'MEL': 'ap-tokyo', 'BOM': 'ap-tokyo',
};

// Health status cache
const healthCache = new Map();

// Check origin health
async function checkHealth(origin) {
  const cacheKey = `health:${origin}`;
  const cached = healthCache.get(cacheKey);

  // Return cached result if fresh (within 30 seconds)
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached.healthy;
  }

  try {
    const response = await fetch(`${origin}/health`, {
      method: 'GET',
      headers: { 'User-Agent': 'Cloudflare-Worker-Health-Check' },
      // Short timeout for health checks
      cf: { cacheTtl: 0 },
    });

    const healthy = response.ok;
    healthCache.set(cacheKey, { healthy, timestamp: Date.now() });
    return healthy;

  } catch (error) {
    healthCache.set(cacheKey, { healthy: false, timestamp: Date.now() });
    return false;
  }
}

// Select the best origin based on location and health
async function selectOrigin(request) {
  // Get the Cloudflare colo (data center) serving this request
  const colo = request.cf?.colo || 'IAD';

  // Determine preferred region based on colo
  const preferredRegion = COLO_TO_REGION[colo] || 'us-east';

  // Define fallback order based on preferred region
  const fallbackOrder = {
    'us-east': ['us-east', 'eu-west', 'ap-tokyo'],
    'eu-west': ['eu-west', 'us-east', 'ap-tokyo'],
    'ap-tokyo': ['ap-tokyo', 'us-east', 'eu-west'],
  };

  // Try each origin in fallback order
  for (const region of fallbackOrder[preferredRegion]) {
    const origin = ORIGINS[region];
    const healthy = await checkHealth(origin);

    if (healthy) {
      return { origin, region };
    }
  }

  // All origins unhealthy, return primary anyway
  return { origin: ORIGINS['us-east'], region: 'us-east' };
}

// Main request handler
async function handleRequest(request) {
  const startTime = Date.now();

  // Select the best origin
  const { origin, region } = await selectOrigin(request);

  // Build the upstream URL
  const url = new URL(request.url);
  const upstreamUrl = `${origin}${url.pathname}${url.search}`;

  // Clone the request with the new URL
  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow',
  });

  // Add custom headers for debugging
  upstreamRequest.headers.set('X-Forwarded-Host', url.hostname);
  upstreamRequest.headers.set('X-Origin-Region', region);
  upstreamRequest.headers.set('X-Client-Colo', request.cf?.colo || 'unknown');
  upstreamRequest.headers.set('X-Client-Country', request.cf?.country || 'unknown');

  // Forward the request to the origin
  const response = await fetch(upstreamRequest);

  // Clone the response and add routing headers
  const modifiedResponse = new Response(response.body, response);
  modifiedResponse.headers.set('X-Served-By', region);
  modifiedResponse.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

  return modifiedResponse;
}

// Event listener
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});
```

## Architecture Patterns

### Active-Active Multi-Region

```mermaid
flowchart TB
    subgraph Global Layer
        GLB[Global Load Balancer]
    end

    subgraph US-East
        ALB1[Application LB]
        subgraph US-Servers
            US1[Server 1]
            US2[Server 2]
        end
        DB1[(Primary DB)]
    end

    subgraph EU-West
        ALB2[Application LB]
        subgraph EU-Servers
            EU1[Server 1]
            EU2[Server 2]
        end
        DB2[(Replica DB)]
    end

    subgraph AP-Tokyo
        ALB3[Application LB]
        subgraph AP-Servers
            AP1[Server 1]
            AP2[Server 2]
        end
        DB3[(Replica DB)]
    end

    GLB --> ALB1
    GLB --> ALB2
    GLB --> ALB3

    ALB1 --> US1 & US2
    ALB2 --> EU1 & EU2
    ALB3 --> AP1 & AP2

    US1 & US2 --> DB1
    EU1 & EU2 --> DB2
    AP1 & AP2 --> DB3

    DB1 <-->|Replication| DB2
    DB1 <-->|Replication| DB3
```

### Hybrid CDN and Origin

```mermaid
flowchart TB
    Users[Global Users]

    subgraph CDN Layer
        CDN[CDN Edge Nodes]
        Cache[Edge Cache]
    end

    subgraph Origin Layer
        GLB[Global LB]
        subgraph Origins
            O1[Origin US]
            O2[Origin EU]
            O3[Origin AP]
        end
    end

    Users --> CDN
    CDN --> Cache
    Cache -->|Cache Miss| GLB
    GLB --> O1 & O2 & O3
```

## Health Checks and Failover

### Multi-Layer Health Checking

```yaml
# kubernetes/health-checks.yaml
# Comprehensive health check configuration

apiVersion: v1
kind: Service
metadata:
  name: api-service
  annotations:
    # External health check endpoint for load balancers
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-path: /health
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-interval: "10"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-timeout: "5"
    service.beta.kubernetes.io/aws-load-balancer-healthy-threshold: "2"
    service.beta.kubernetes.io/aws-load-balancer-unhealthy-threshold: "3"
spec:
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8080

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: api:latest
          ports:
            - containerPort: 8080

          # Liveness probe: restart container if unhealthy
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          # Readiness probe: remove from service if not ready
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 2

          # Startup probe: allow slow startup
          startupProbe:
            httpGet:
              path: /health/startup
              port: 8080
            initialDelaySeconds: 0
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 30
```

### Health Check Endpoint Implementation

```python
# app/health.py
# Comprehensive health check endpoints

from fastapi import FastAPI, Response, status
from datetime import datetime
import asyncio
import aiohttp
import asyncpg

app = FastAPI()

# Track application state
startup_complete = False
shutting_down = False

# Dependencies to check
DEPENDENCIES = {
    'database': {
        'check': 'check_database',
        'critical': True,
    },
    'cache': {
        'check': 'check_cache',
        'critical': False,
    },
    'external_api': {
        'check': 'check_external_api',
        'critical': False,
    },
}


async def check_database() -> dict:
    """
    Check database connectivity and query performance.
    Returns health status and latency.
    """
    try:
        start = datetime.now()

        # Use connection pool from app state
        pool = app.state.db_pool
        async with pool.acquire() as conn:
            # Simple query to verify connectivity
            result = await conn.fetchval('SELECT 1')

        latency_ms = (datetime.now() - start).total_seconds() * 1000

        return {
            'healthy': result == 1,
            'latency_ms': round(latency_ms, 2),
            'message': 'Database connection successful',
        }

    except Exception as e:
        return {
            'healthy': False,
            'latency_ms': None,
            'message': f'Database error: {str(e)}',
        }


async def check_cache() -> dict:
    """
    Check Redis cache connectivity.
    """
    try:
        start = datetime.now()

        redis = app.state.redis
        await redis.ping()

        latency_ms = (datetime.now() - start).total_seconds() * 1000

        return {
            'healthy': True,
            'latency_ms': round(latency_ms, 2),
            'message': 'Cache connection successful',
        }

    except Exception as e:
        return {
            'healthy': False,
            'latency_ms': None,
            'message': f'Cache error: {str(e)}',
        }


async def check_external_api() -> dict:
    """
    Check external API dependency.
    """
    try:
        start = datetime.now()

        async with aiohttp.ClientSession() as session:
            async with session.get(
                'https://api.external-service.com/health',
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                healthy = response.status == 200

        latency_ms = (datetime.now() - start).total_seconds() * 1000

        return {
            'healthy': healthy,
            'latency_ms': round(latency_ms, 2),
            'message': 'External API reachable',
        }

    except Exception as e:
        return {
            'healthy': False,
            'latency_ms': None,
            'message': f'External API error: {str(e)}',
        }


@app.get('/health/live')
async def liveness():
    """
    Liveness probe endpoint.
    Returns 200 if the application process is running.
    Used by Kubernetes to restart unhealthy containers.
    """
    # Check if application is shutting down
    if shutting_down:
        return Response(
            content='{"status": "shutting_down"}',
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type='application/json',
        )

    return {'status': 'alive', 'timestamp': datetime.utcnow().isoformat()}


@app.get('/health/ready')
async def readiness():
    """
    Readiness probe endpoint.
    Returns 200 if the application can handle traffic.
    Used by load balancers to route traffic.
    """
    # Check if startup is complete
    if not startup_complete:
        return Response(
            content='{"status": "starting"}',
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type='application/json',
        )

    # Check critical dependencies
    checks = {}
    all_critical_healthy = True

    for name, config in DEPENDENCIES.items():
        check_func = globals()[config['check']]
        result = await check_func()
        checks[name] = result

        if config['critical'] and not result['healthy']:
            all_critical_healthy = False

    response_data = {
        'status': 'ready' if all_critical_healthy else 'not_ready',
        'timestamp': datetime.utcnow().isoformat(),
        'checks': checks,
    }

    if all_critical_healthy:
        return response_data
    else:
        return Response(
            content=str(response_data),
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type='application/json',
        )


@app.get('/health/startup')
async def startup():
    """
    Startup probe endpoint.
    Returns 200 once initial startup tasks are complete.
    Allows slow-starting containers to initialize.
    """
    if startup_complete:
        return {'status': 'started', 'timestamp': datetime.utcnow().isoformat()}
    else:
        return Response(
            content='{"status": "starting"}',
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type='application/json',
        )


@app.get('/health')
async def health():
    """
    Comprehensive health check for external monitoring.
    Returns detailed status of all dependencies.
    Used by global load balancers and monitoring systems.
    """
    checks = {}
    overall_healthy = True

    # Run all health checks in parallel
    tasks = []
    for name, config in DEPENDENCIES.items():
        check_func = globals()[config['check']]
        tasks.append((name, config['critical'], check_func()))

    results = await asyncio.gather(*[t[2] for t in tasks], return_exceptions=True)

    for i, (name, critical, _) in enumerate(tasks):
        result = results[i]

        if isinstance(result, Exception):
            result = {
                'healthy': False,
                'latency_ms': None,
                'message': f'Check failed: {str(result)}',
            }

        checks[name] = result

        if not result['healthy'] and critical:
            overall_healthy = False

    response_data = {
        'status': 'healthy' if overall_healthy else 'unhealthy',
        'timestamp': datetime.utcnow().isoformat(),
        'region': 'us-east-1',  # Set from environment
        'version': '1.2.3',  # Application version
        'checks': checks,
    }

    status_code = status.HTTP_200_OK if overall_healthy else status.HTTP_503_SERVICE_UNAVAILABLE

    return Response(
        content=str(response_data),
        status_code=status_code,
        media_type='application/json',
    )


@app.on_event('startup')
async def on_startup():
    """
    Initialize application dependencies on startup.
    """
    global startup_complete

    # Initialize database pool
    app.state.db_pool = await asyncpg.create_pool(
        'postgresql://user:pass@localhost/db',
        min_size=5,
        max_size=20,
    )

    # Mark startup as complete
    startup_complete = True


@app.on_event('shutdown')
async def on_shutdown():
    """
    Graceful shutdown handler.
    """
    global shutting_down
    shutting_down = True

    # Allow time for load balancers to stop sending traffic
    await asyncio.sleep(10)

    # Close database pool
    await app.state.db_pool.close()
```

## Traffic Management Strategies

### Weighted Traffic Distribution

```mermaid
flowchart LR
    subgraph Traffic Split
        GLB[Global LB]
    end

    subgraph Canary Deployment
        GLB -->|90%| Stable[Stable Version]
        GLB -->|10%| Canary[Canary Version]
    end
```

### Blue-Green Deployment

```hcl
# terraform/blue_green.tf
# Blue-green deployment with weighted routing

variable "active_environment" {
  description = "Currently active environment (blue or green)"
  default     = "blue"
}

# Blue environment record
resource "aws_route53_record" "api_blue" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  weighted_routing_policy {
    # Full weight when active, zero when inactive
    weight = var.active_environment == "blue" ? 100 : 0
  }

  set_identifier = "blue"

  alias {
    name                   = aws_lb.blue.dns_name
    zone_id                = aws_lb.blue.zone_id
    evaluate_target_health = true
  }
}

# Green environment record
resource "aws_route53_record" "api_green" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  weighted_routing_policy {
    weight = var.active_environment == "green" ? 100 : 0
  }

  set_identifier = "green"

  alias {
    name                   = aws_lb.green.dns_name
    zone_id                = aws_lb.green.zone_id
    evaluate_target_health = true
  }
}
```

## Monitoring Global Load Balancing

### Key Metrics to Track

```yaml
# prometheus/recording_rules.yaml
# Recording rules for global load balancing metrics

groups:
  - name: global_lb_metrics
    interval: 30s
    rules:
      # Request rate by region
      - record: glb:requests:rate5m
        expr: |
          sum by (region) (
            rate(http_requests_total[5m])
          )

      # Latency percentiles by region
      - record: glb:latency:p99
        expr: |
          histogram_quantile(0.99,
            sum by (region, le) (
              rate(http_request_duration_seconds_bucket[5m])
            )
          )

      # Error rate by region
      - record: glb:errors:rate5m
        expr: |
          sum by (region) (
            rate(http_requests_total{status=~"5.."}[5m])
          ) / sum by (region) (
            rate(http_requests_total[5m])
          )

      # Health check success rate
      - record: glb:health:success_rate
        expr: |
          sum by (region) (
            rate(health_check_success_total[5m])
          ) / sum by (region) (
            rate(health_check_total[5m])
          )

  - name: global_lb_alerts
    rules:
      # Alert on high error rate
      - alert: HighErrorRateInRegion
        expr: glb:errors:rate5m > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in {{ $labels.region }}"
          description: "Error rate is {{ $value | humanizePercentage }} in {{ $labels.region }}"

      # Alert on region failure
      - alert: RegionUnhealthy
        expr: glb:health:success_rate < 0.5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Region {{ $labels.region }} is unhealthy"
          description: "Health check success rate is {{ $value | humanizePercentage }}"

      # Alert on traffic imbalance
      - alert: TrafficImbalance
        expr: |
          max(glb:requests:rate5m) / min(glb:requests:rate5m) > 3
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Traffic imbalance detected across regions"
```

### Dashboard Queries

```promql
# Grafana dashboard queries for global load balancing

# Total requests per region (timeseries)
sum by (region) (rate(http_requests_total[5m]))

# Latency heatmap by region
histogram_quantile(0.95,
  sum by (region, le) (
    rate(http_request_duration_seconds_bucket[5m])
  )
)

# Geographic traffic distribution (pie chart)
sum by (country) (increase(http_requests_total[1h]))

# Failover events timeline
changes(active_region_info[1h])

# Cross-region latency (for replication monitoring)
probe_duration_seconds{job="cross_region_probe"}
```

## Best Practices

### DNS TTL Configuration

Keep DNS TTLs low for global load balancing to enable fast failover, but not so low that DNS query volume becomes a problem.

| Use Case | Recommended TTL | Rationale |
|----------|-----------------|-----------|
| Normal operation | 60-300 seconds | Balance between cacheability and flexibility |
| During deployment | 30-60 seconds | Faster propagation of changes |
| After failover trigger | 30 seconds | Rapid traffic shift |
| Static content CDN | 3600+ seconds | Maximize cache efficiency |

### Session Affinity Considerations

```mermaid
flowchart TD
    subgraph With Session Affinity
        U1[User] -->|Cookie: region=us| GLB1[Global LB]
        GLB1 -->|Same region| US[US Region]
    end

    subgraph Without Session Affinity
        U2[User] --> GLB2[Global LB]
        GLB2 -->|Request 1| US2[US Region]
        GLB2 -->|Request 2| EU[EU Region]
        GLB2 -->|Request 3| AP[AP Region]
    end
```

When to use session affinity:
- Stateful applications that store session data locally
- WebSocket connections that must stay on the same server
- Applications with significant warm-up costs

When to avoid session affinity:
- Stateless REST APIs
- Applications using distributed session stores
- When you need immediate failover capability

### Security Considerations

1. **DDoS Protection**: Use anycast to distribute attack traffic across multiple PoPs
2. **Rate Limiting**: Implement per-region rate limits to prevent cascade failures
3. **TLS Termination**: Terminate TLS at edge locations for lower latency
4. **Origin Protection**: Use private connectivity between edge and origin

---

Global load balancing is essential for delivering consistent performance to users worldwide. Start with GeoDNS for simple geographic routing, add health checks for automatic failover, and consider anycast or latency-based routing for optimal performance. Monitor your traffic patterns and adjust your routing policies based on real user experience data.
