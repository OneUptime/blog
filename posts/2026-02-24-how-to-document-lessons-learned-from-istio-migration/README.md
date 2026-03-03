# How to Document Lessons Learned from Istio Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Documentation, Migration, Kubernetes, Best Practices

Description: How to capture and document lessons learned during an Istio migration so future teams and projects benefit from your experience.

---

Your Istio migration is done. Services are running, metrics are flowing, and mTLS is encrypting traffic. Now comes the part that every team skips: documenting what you learned.

I get it. Documentation is not exciting. But the lessons from your migration will save your team (and future team members) weeks of debugging, wrong turns, and repeated mistakes. The migration knowledge is fresh right now. In six months, half the details will be forgotten.

## What to Document

Not everything needs to be written down. Focus on information that would change someone's decisions or save them significant time.

### Decision Log

Document every major decision and why you made it. This is the single most valuable artifact because it prevents teams from relitigating decisions that have already been thoroughly evaluated.

```markdown
## Decision: Istio Installation Method
- **Decision**: Use istioctl with revision-based upgrades
- **Alternatives considered**: Helm, Istio Operator
- **Why**: Revision-based upgrades let us run canary control planes,
  which is critical for our zero-downtime requirement. Helm was rejected
  because revision support was more complex. The operator was rejected
  because it adds another component to manage.
- **Date**: 2026-01-15

## Decision: mTLS Rollout Strategy
- **Decision**: Start PERMISSIVE, move to STRICT per-namespace
- **Alternatives considered**: Mesh-wide STRICT from day one
- **Why**: We have 3 services that talk to external databases without
  sidecars. STRICT mode would break these until we configure exceptions.
- **Date**: 2026-01-20

## Decision: Keep Kubernetes NetworkPolicies
- **Decision**: Keep existing NetworkPolicies alongside Istio AuthorizationPolicies
- **Alternatives considered**: Remove NetworkPolicies after migration
- **Why**: Defense in depth. NetworkPolicies catch L3/L4 traffic that
  bypasses the mesh. The overhead of maintaining both is minimal.
- **Date**: 2026-02-01
```

### Issues Encountered and Resolutions

Create a structured log of every issue you hit during migration:

```markdown
## Issue: MySQL connections failing after sidecar injection
- **Symptoms**: Backend service could not connect to MySQL, error:
  "connection refused"
- **Root cause**: MySQL uses server-first protocol. Sidecar was
  intercepting the connection and waiting for client data that
  never came.
- **Resolution**: Added port naming `tcp-mysql` and created
  DestinationRule with TLS mode DISABLE for the database host.
- **Time to resolve**: 3 hours
- **Impact**: Backend service had degraded performance for 45 minutes

## Issue: Pods stuck in Init state after sidecar injection
- **Symptoms**: Pods never became Ready, stuck in Init:0/1
- **Root cause**: The istio-init container could not modify iptables
  because the node had a restrictive PodSecurityPolicy.
- **Resolution**: Updated PSP to allow NET_ADMIN and NET_RAW capabilities
  for the istio-init container.
- **Time to resolve**: 2 hours
- **Impact**: New deployments were blocked for 1 hour

## Issue: Intermittent 503 errors on high-traffic service
- **Symptoms**: 2-3% of requests to the payments service returned 503
- **Root cause**: Default connection pool settings were too low.
  http1MaxPendingRequests default of 1024 was insufficient.
- **Resolution**: Created DestinationRule with increased connection
  pool limits (http1MaxPendingRequests: 4096, maxConnections: 2000)
- **Time to resolve**: 5 hours (initially misdiagnosed as DNS issue)
- **Impact**: 2-3% error rate for payments service for half a day
```

### Performance Data

Record actual performance measurements, not estimates:

```markdown
## Performance Impact Summary

### Latency
| Service | Pre-Migration P50 | Post-Migration P50 | Overhead |
|---------|-------------------|--------------------| ---------|
| API Gateway | 12ms | 14ms | +2ms |
| Auth Service | 8ms | 10ms | +2ms |
| User Service | 15ms | 17ms | +2ms |
| Payment Service | 45ms | 48ms | +3ms |

### Resource Overhead
| Metric | Value |
|--------|-------|
| Sidecar CPU per pod (avg) | 35m |
| Sidecar memory per pod (avg) | 72Mi |
| Total sidecar CPU (cluster) | 8.4 cores |
| Total sidecar memory (cluster) | 17.3Gi |
| Control plane CPU | 1.2 cores |
| Control plane memory | 2.8Gi |

### Migration Timeline
| Phase | Duration | Services | Issues |
|-------|----------|----------|--------|
| Staging | 1 week | 12 | 3 |
| Non-critical prod | 2 weeks | 45 | 5 |
| Critical prod | 1 week | 23 | 2 |
| Cleanup | 3 days | - | 0 |
```

### Configuration That Worked

Save the final working configuration as a reference for future clusters:

```yaml
# Working IstioOperator configuration
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: production-istio
spec:
  profile: default
  meshConfig:
    accessLogFile: ""
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      concurrency: 2
      terminationDrainDuration: 15s
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 500m
            memory: 512Mi
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
```

### What You Would Do Differently

This is the most honest and useful section. Be candid.

```markdown
## Retrospective: What We Would Do Differently

### Start with Sidecar resources from day one
We initially used default sidecar resource settings and spent a week
debugging performance issues that turned out to be CPU throttling.
We should have set explicit resource requests and limits before
starting migration.

### Create ServiceEntry resources proactively
We discovered external dependencies one at a time as they broke.
We should have audited all outbound connections before migration
and created ServiceEntry resources for all of them upfront.

### Run the migration during business hours
We ran the first production phase on a Saturday thinking it would
be safer. Instead, it was harder because half the team was
unavailable. The second phase ran on a Tuesday morning with the
full team online and went much smoother.

### Better monitoring before starting
We set up Istio-specific dashboards partway through migration. We
should have had them ready before the first pod was injected. Flying
blind during the first few services was stressful.

### Invest in developer communication earlier
The first team whose services we migrated had no context and filed
three incident tickets. After we started running workshops and
sending migration notifications, issues dropped dramatically.
```

## Where to Store the Documentation

Put it somewhere your team actually looks. Some options:

- A dedicated page in your internal wiki
- A `docs/istio-migration` directory in your infrastructure repository
- A post-mortem style document in your incident management system

```bash
# Example: Store in your infrastructure repo
mkdir -p docs/istio-migration
```

Structure it so people can find specific information quickly:

```text
docs/istio-migration/
  README.md                    # Overview and timeline
  decision-log.md              # All major decisions
  issues-and-resolutions.md    # Every issue encountered
  performance-data.md          # Before/after measurements
  configuration-reference.md   # Working configs
  retrospective.md             # What we'd do differently
  runbooks/
    rollback.md                # How to roll back
    troubleshooting.md         # Common debugging steps
    adding-new-service.md      # How to add a service to the mesh
```

## Making Documentation Useful Long-Term

The documentation is only valuable if people use it. Keep it maintained:

- Review and update after each Istio version upgrade
- Add new issues as they are discovered
- Link to it from your onboarding documentation
- Reference it in incident post-mortems

Write it for the person who joins your team six months from now and needs to understand why things are configured the way they are. That person might be you, having forgotten the details. Clear, honest documentation is a gift to your future self and your team.
