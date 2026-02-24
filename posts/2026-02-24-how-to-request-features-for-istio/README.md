# How to Request Features for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Feature Requests, Open Source, Community, Service Mesh

Description: How to effectively request new features for the Istio project by understanding the RFC process, engaging with working groups, and building community support.

---

Istio is a community-driven project, and feature requests from users shape its roadmap. But submitting a feature request is more than just opening a GitHub issue and hoping for the best. The most successful feature requests are well-thought-out, clearly articulate the problem, and show that other users share the need.

Here is how to navigate the Istio feature request process effectively.

## Start with the Problem, Not the Solution

The biggest mistake in feature requests is leading with a specific solution instead of describing the problem. Maintainers know the codebase better than you do, and they might have a simpler or more elegant approach in mind.

Bad feature request:
> "Add a `retryBudget` field to VirtualService that limits total retries per second."

Good feature request:
> "In a deep call chain (A -> B -> C -> D), retry configuration at each level causes exponential retry amplification. During partial failures, the downstream service receives 10-100x normal traffic due to retries compounding at each hop. We need a way to limit the total retry load on a destination."

The second version explains the pain point clearly. The maintainers might solve it with a retry budget, circuit breaker improvements, or something else entirely.

## Check If the Feature Already Exists

Before requesting a feature, make sure it does not already exist:

```bash
# Search documentation
# https://istio.io/latest/docs/

# Search existing feature requests
gh issue list --repo istio/istio --label "kind/feature" --search "your feature" --state open

# Search closed issues (it might have been discussed and rejected)
gh issue list --repo istio/istio --label "kind/feature" --search "your feature" --state closed
```

Also check if the feature is planned in an upcoming release:

```bash
# Check the Istio roadmap
# https://github.com/istio/istio/blob/master/ROADMAP.md

# Check recent RFCs
# https://github.com/istio/enhancements
gh issue list --repo istio/enhancements --state open
```

## File a Feature Request on GitHub

Go to https://github.com/istio/istio/issues/new and select the Feature Request template.

Structure your request like this:

### Title
Keep it concise and descriptive:
"Support retry budget configuration to prevent retry amplification"

### Problem Statement
Describe the problem you are facing in detail:

```
When services in a mesh have retry configuration at multiple levels
of a call chain, a single failing service causes retry amplification.

Example scenario:
- Frontend retries 3 times to API service
- API service retries 3 times to Backend service
- Backend service retries 3 times to Database service

If the Database service fails, it receives 3 * 3 * 3 = 27 requests
for every single user request. This turns a partial failure into a
complete outage.

Currently, the only mitigation is to disable retries on interior
services, but this removes resilience for transient failures at
those levels.
```

### Use Cases
Provide concrete examples of who would benefit:

```
Use Case 1: E-commerce platform with 5-service-deep call chains.
During Black Friday, a database hiccup caused retry amplification
that overwhelmed the connection pool and took down the entire
checkout flow.

Use Case 2: Microservices migration where teams independently
configure retries without visibility into the full call chain.
```

### Proposed Solution (Optional)
If you have a specific idea, share it, but make it clear that you are open to alternatives:

```
One possible approach would be to add a retry budget to
DestinationRule that limits total concurrent retries to a
destination, similar to Envoy's retry budget feature:

apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: database
spec:
  host: database
  trafficPolicy:
    connectionPool:
      http:
        retryBudget:
          budgetPercent: 20
          minRetriesPerSecond: 10

I am not wedded to this specific API. Any solution that prevents
retry amplification in deep call chains would solve our problem.
```

### Impact
Describe how important this is:

```
This affects any Istio deployment with service call chains deeper
than 2 levels where retries are configured. Without this feature,
teams have to choose between retry resilience and retry safety,
and many end up disabling retries entirely.
```

## The Enhancement Proposal Process

For larger features, Istio uses an enhancement proposal process through the `istio/enhancements` repository:

```bash
# Check existing proposals
gh issue list --repo istio/enhancements --state open
```

To submit an enhancement proposal:

1. Create an issue in `istio/enhancements` describing the feature
2. If there is interest, you will be asked to write a design document
3. The design document goes through review by the relevant working group
4. Once approved, implementation can begin

The design document typically includes:
- Problem statement
- Detailed design
- API changes
- Migration plan
- Testing approach

## Engage with Working Groups

Istio has several working groups that focus on different areas:

- **Networking**: Traffic management, VirtualService, Gateway API
- **Security**: mTLS, authorization, authentication
- **Environment**: Installation, upgrades, multi-cluster
- **Extensions**: Wasm, EnvoyFilter, telemetry

Find the right working group for your feature:

```bash
# Working group information
# https://github.com/istio/community/blob/master/WORKING-GROUPS.md
```

Attend the working group meeting and present your use case. This is much more effective than just filing an issue because:
- You can answer questions in real time
- You build relationships with maintainers
- You get immediate feedback on feasibility
- Other attendees might share similar needs, which strengthens your case

## Build Community Support

Feature requests with broad community support are more likely to be prioritized:

1. Share your request on the Istio Slack `#users` channel
2. Link the issue in relevant discussions
3. Ask others with similar needs to add a thumbs-up reaction to the issue
4. Write a blog post explaining the problem (like on your company's engineering blog)

GitHub reactions on the issue help maintainers gauge demand:

```
# A feature request with 50+ thumbs-up reactions
# gets much more attention than one with 2
```

## Offer to Help Implement

If you have Go development experience, offering to implement the feature dramatically increases the chance of it being accepted:

```
I'm happy to implement this feature if the approach is approved.
I have experience with Go and have contributed to other CNCF projects.
```

Even if you cannot implement it fully, you can help by:
- Writing tests
- Updating documentation
- Reviewing the design
- Testing pre-release builds

## Follow Up Effectively

After submitting your request:

1. Respond to questions promptly
2. Provide additional use cases if asked
3. Accept that not every feature request will be accepted
4. If rejected, ask for the reasoning. It might lead to a better alternative.

Check on your request periodically:

```bash
# Check status of your feature requests
gh issue list --repo istio/istio --author @me --label "kind/feature" --state open
```

If there is no activity after a month, leave a polite comment:

```
Hi, just checking if there's been any discussion about this feature
request. Happy to provide more details or adjust the proposal based
on feedback.
```

## When Features Get Rejected

Not every feature request will be accepted, and that is okay. Common reasons for rejection:
- Too niche (only benefits a very small number of users)
- Can be solved with existing features
- Conflicts with the project's direction
- Too complex for the benefit it provides

If your feature is rejected, consider:
- Building it as an EnvoyFilter or Wasm plugin
- Implementing it as an external controller
- Contributing to a related feature that partially addresses your need

Feature requests are how Istio grows to meet real-world needs. Take the time to write them well, engage with the community, and be open to alternative solutions. Even if your specific request is not implemented, the discussion often leads to improvements that benefit everyone.
