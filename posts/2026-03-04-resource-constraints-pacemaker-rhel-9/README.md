# How to Configure Resource Constraints in Pacemaker on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, Constraints, High Availability, Cluster, Linux

Description: Learn how to configure location, order, and colocation constraints in Pacemaker on RHEL to control resource placement and startup behavior.

---

Pacemaker constraints on RHEL control where resources run, in what order they start, and which resources must run together. The three types of constraints are location, order, and colocation.

## Prerequisites

- A running RHEL Pacemaker cluster with resources configured
- Root or sudo access

## Location Constraints

Location constraints control which nodes a resource prefers or avoids.

### Prefer a Node

```bash
sudo pcs constraint location VIP prefers node1=100
```

The score (100) indicates preference strength. Higher scores mean stronger preference. INFINITY forces the resource to that node.

### Avoid a Node

```bash
sudo pcs constraint location VIP avoids node2=100
```

### Force a Resource to a Specific Node

```bash
sudo pcs constraint location VIP prefers node1=INFINITY
```

### Rule-Based Location Constraints

Run a resource on a node only during business hours:

```bash
sudo pcs constraint location VIP rule score=INFINITY \
    date-spec hours=9-17 weekdays=1-5
```

Run a resource based on a node attribute:

```bash
sudo pcs node attribute node1 location=primary
sudo pcs constraint location VIP rule score=INFINITY '#uname' eq node1
```

## Order Constraints

Order constraints define the startup and shutdown order of resources.

### Mandatory Ordering

VIP must start before WebServer:

```bash
sudo pcs constraint order VIP then WebServer
```

### Optional Ordering

Prefer an order but allow resources to start independently:

```bash
sudo pcs constraint order VIP then WebServer kind=Optional
```

### Serialized Ordering

Ensure resources never start or stop simultaneously:

```bash
sudo pcs constraint order VIP then WebServer symmetrical=true
```

## Colocation Constraints

Colocation constraints ensure resources run on the same (or different) nodes.

### Run Together

WebServer must run on the same node as VIP:

```bash
sudo pcs constraint colocation add WebServer with VIP INFINITY
```

### Run on Different Nodes

Ensure two resources never run on the same node:

```bash
sudo pcs constraint colocation add ResourceA with ResourceB -INFINITY
```

### Colocation with Score

A positive score prefers co-location. A negative score avoids it:

```bash
sudo pcs constraint colocation add WebServer with VIP 500
```

## Viewing Constraints

View all constraints:

```bash
sudo pcs constraint
```

View specific constraint types:

```bash
sudo pcs constraint location
sudo pcs constraint order
sudo pcs constraint colocation
```

View constraints in reference format:

```bash
sudo pcs constraint --full
```

## Removing Constraints

Remove a specific constraint by ID:

```bash
sudo pcs constraint remove constraint-id
```

Find the constraint ID with:

```bash
sudo pcs constraint --full
```

Remove all location constraints for a resource:

```bash
sudo pcs constraint location remove VIP
```

## Using Resource Groups Instead of Constraints

For simple cases where resources must run together and start in order, resource groups are simpler than individual constraints:

```bash
sudo pcs resource group add WebGroup VIP WebServer SharedFS
```

This automatically creates implicit colocation (same node) and ordering (start in listed order) constraints.

## Best Practices

1. Use resource groups for simple co-location and ordering needs
2. Use explicit constraints for complex relationships
3. Avoid circular dependencies in order constraints
4. Use INFINITY scores only when placement is mandatory
5. Test constraints by simulating node failures

## Testing Constraints

Simulate resource placement:

```bash
sudo pcs resource move VIP node2
sudo pcs status
sudo pcs resource clear VIP
```

Verify constraints are working:

```bash
sudo pcs constraint location show resources VIP
```

## Conclusion

Pacemaker constraints on RHEL provide precise control over resource placement and behavior. Use location constraints for node preferences, order constraints for startup sequences, and colocation constraints for keeping resources together. For simple relationships, resource groups combine all three.
