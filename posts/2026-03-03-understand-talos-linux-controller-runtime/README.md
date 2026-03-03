# How to Understand Talos Linux Controller Runtime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Controller Runtime, Reconciliation, Kubernetes, System Architecture

Description: Understand how the Talos Linux controller runtime reconciles system state and keeps your nodes in their desired configuration.

---

If you have worked with Kubernetes, you are familiar with the controller pattern. A controller watches the desired state of a resource, compares it to the actual state, and takes action to reconcile any differences. Talos Linux applies this exact same pattern at the operating system level through its controller runtime.

The controller runtime is the engine inside machined that makes Talos self-healing. When you apply a configuration change, you are not running a script that makes one-time changes. You are updating a desired state that controllers continuously work to achieve.

## What Is the Controller Runtime?

The controller runtime is a framework built into machined that runs multiple controllers concurrently. Each controller is responsible for a specific aspect of the system. There is a network controller, a time controller, a hostname controller, an etcd controller, and many others.

Each controller follows the same pattern:

1. Watch one or more input resources for changes
2. When an input changes, calculate the desired output state
3. Compare the desired output with the actual output
4. If they differ, take action to reconcile

This is a continuous loop, not a one-shot operation. Controllers never stop watching and reconciling.

```bash
# See the resources that controllers manage
talosctl -n 10.0.0.11 get rd

# This lists all resource definitions - each one is managed by a controller
# Examples:
# addresses.net.talos.dev
# routes.net.talos.dev
# links.net.talos.dev
# hostnames.net.talos.dev
# resolvers.net.talos.dev
# timeservers.net.talos.dev
```

## How Controllers Work

Let us trace through a concrete example. Say you change the hostname in the machine configuration. Here is what happens.

First, you apply the new configuration through the API.

```bash
talosctl -n 10.0.0.11 patch machineconfig --patch '[
  {"op": "replace", "path": "/machine/network/hostname", "value": "new-name"}
]'
```

The configuration controller detects that the machine config resource has changed. It reads the new hostname from the configuration and updates the HostnameSpec resource.

The hostname controller watches HostnameSpec resources. When the spec changes, it takes the new hostname value and applies it to the system (calling the kernel's sethostname). It also updates the HostnameStatus resource to reflect the current state.

If for any reason the hostname reverts (which would be unusual, but controllers are designed to handle it), the controller would detect the drift and correct it.

```bash
# Watch the hostname resource change
talosctl -n 10.0.0.11 get hostname --watch

# After changing the config, you will see the hostname update
```

## The Resource Model

The controller runtime operates on resources, which are strongly typed objects stored in memory. Resources have a type, a namespace, an ID, and a spec (the data).

Resources come in two flavors:

**Spec resources** represent desired state. When you change the machine configuration, the configuration controller creates or updates spec resources.

**Status resources** represent actual state. Controllers that perform actions update status resources to reflect what is actually happening on the system.

```bash
# View a spec resource (desired state)
talosctl -n 10.0.0.11 get hostnamespec -o yaml

# View a status resource (actual state)
talosctl -n 10.0.0.11 get hostnamestatus -o yaml

# They should match if the system is reconciled
```

This separation of spec and status is a pattern borrowed directly from Kubernetes. The API server stores specs (desired state), and controllers update status (actual state).

## Key Controllers in Talos

### Network Controllers

There are several network-related controllers that manage different aspects of networking.

The **address controller** watches AddressSpec resources and configures IP addresses on network interfaces using netlink.

The **route controller** watches RouteSpec resources and manages the kernel routing table.

The **link controller** watches LinkSpec resources and configures network interfaces (bringing them up/down, setting MTU, etc.).

The **resolver controller** watches ResolverSpec resources and configures DNS resolution.

```bash
# See network resources managed by controllers
talosctl -n 10.0.0.11 get addressspecs
talosctl -n 10.0.0.11 get routespecs
talosctl -n 10.0.0.11 get linkspecs
talosctl -n 10.0.0.11 get resolverspecs
```

### Time Controller

The time controller manages NTP synchronization. It watches TimeServerSpec resources and ensures the system clock is synchronized with the configured NTP servers.

```bash
# View time configuration
talosctl -n 10.0.0.11 get timeserverspecs
talosctl -n 10.0.0.11 get timestatus
```

### Configuration Controller

The configuration controller is special. It watches the machine configuration resource (the YAML document you provide) and creates spec resources for all other controllers. It is the controller that translates your high-level configuration into specific resource specs.

```bash
# View the machine configuration resource
talosctl -n 10.0.0.11 get machineconfig
```

### etcd Controller

On control plane nodes, the etcd controller manages the etcd member lifecycle. It handles bootstrapping a new etcd cluster, joining an existing cluster, and managing member status.

```bash
# View etcd member status
talosctl -n 10.0.0.11 etcd members
```

### Kubelet Controller

The kubelet controller manages the kubelet service. It generates kubelet configuration, manages the kubelet certificate, and ensures kubelet is running with the correct parameters.

## Controller Dependencies

Controllers have dependencies on each other. The network controllers must run before the kubelet controller because kubelet needs a working network. The configuration controller must run before everything because all other controllers depend on the specs it creates.

machined handles these dependencies by ordering controller execution and ensuring that controllers wait for their dependencies to produce outputs before they start processing.

```
Configuration Controller
    |
    v
Network Controllers (address, route, link, resolver)
    |
    v
Time Controller
    |
    v
etcd Controller (control plane only)
    |
    v
Kubelet Controller
```

## Self-Healing in Practice

The controller runtime makes Talos self-healing at the OS level. Here are some examples.

**Network recovery**: If a network interface goes down temporarily (cable unplugged, switch reboot), the link controller detects the state change and reconfigures the interface when it comes back up. IP addresses, routes, and DNS are all restored automatically.

**Service restart**: If kubelet crashes, machined restarts it. If etcd becomes unhealthy, the etcd controller takes corrective action.

**Configuration drift**: If something externally modifies the routing table (perhaps a DHCP renewal changes a route), the route controller detects the drift and corrects it to match the spec.

```bash
# You can observe self-healing by watching resources
# If you see a status flicker and then return to normal,
# that is a controller fixing a transient issue
talosctl -n 10.0.0.11 get addresses --watch
talosctl -n 10.0.0.11 get routes --watch
```

## Comparing with Kubernetes Controllers

The Talos controller runtime is heavily inspired by Kubernetes controllers, but there are some differences.

In Kubernetes, controllers typically run in a control loop with a work queue. They process events from informers and reconcile one object at a time.

In Talos, controllers use a dependency graph model. Outputs of one controller become inputs to another, and the runtime ensures correct ordering. This is more like a reactive pipeline than a work queue.

Both systems are declarative and eventually consistent. Both handle concurrent operation. Both are idempotent (running the same reconciliation twice produces the same result).

```bash
# The resource model in Talos is similar to Kubernetes
# Kubernetes: kubectl get pods
# Talos: talosctl get members

# Kubernetes: kubectl describe pod my-pod
# Talos: talosctl get hostname -o yaml

# Kubernetes: kubectl get pods --watch
# Talos: talosctl get addresses --watch
```

## Debugging Controller Issues

When something is not working as expected, you can investigate by checking resource states and controller logs.

```bash
# Step 1: Check if the spec resource exists and has the right values
talosctl -n 10.0.0.11 get addressspecs -o yaml

# Step 2: Check if the status resource matches the spec
talosctl -n 10.0.0.11 get addresses -o yaml

# Step 3: If they do not match, check machined logs for errors
talosctl -n 10.0.0.11 logs machined | grep -i "error\|controller"

# Step 4: Check for conflicting resources
talosctl -n 10.0.0.11 get addressspecs -o yaml | grep -A5 "layer"
# Resources from different layers (config, operator, DHCP) can conflict
```

## Resource Layers

Resources can come from different layers, and layers have priority. Configuration layer resources (from the machine config) take precedence over operator layer resources (from DHCP). This ensures that your explicit configuration always wins over dynamic values.

```bash
# View the layer of a resource
talosctl -n 10.0.0.11 get addressspecs -o yaml

# Look for the "layer" field in the metadata
# "configuration" - from machine config
# "operator" - from DHCP or other dynamic sources
# "default" - system defaults
```

## Conclusion

The controller runtime is what makes Talos Linux declarative and self-healing. By applying the Kubernetes controller pattern at the operating system level, Talos ensures that the system continuously converges toward the desired state defined in the machine configuration. Each controller manages a specific aspect of the system, watches for changes, and reconciles differences. This design eliminates configuration drift, handles transient failures automatically, and provides a predictable, auditable system management model. Once you understand the controller runtime, the behavior of Talos nodes becomes much more transparent and predictable.
