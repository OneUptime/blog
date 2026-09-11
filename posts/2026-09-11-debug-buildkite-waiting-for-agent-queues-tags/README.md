# How to Debug Buildkite Jobs Waiting for an Agent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, DevOps, Troubleshooting, YAML

Description: Trace Buildkite waiting jobs through cluster membership, queue names, agent tags, available capacity, and concurrency limits.

---

A Buildkite job waiting for an agent is not always a capacity problem. The job may target a queue with no connected agents, require a tag no agent advertises, or belong to a different cluster. Adding more machines with the same incorrect configuration does not make that job eligible.

Start with one waiting job and compare its effective targeting rules with the connected agents. Only move to autoscaling after proving that at least one agent configuration can match the job.

## Distinguish scheduling states

A dependency waiting on tests, an unsubmitted input step, and a job limited by a concurrency group are different from an eligible command job without an agent. Open the job details and inspect its state, dependencies, queue, and requested agent tags.

If the job is `limited`, inspect the concurrency group and older jobs holding its capacity. If the job explicitly depends on an unsubmitted input step, investigate that dependency. Input steps prevent build completion but do not automatically block other steps from running. Agent counts do not resolve either condition.

Write down the failing job's build URL and step key before changing the pipeline. A recreated job may have a different effective configuration, making an apparent improvement hard to explain.

## Compare the pipeline's effective queue

A pipeline can set targeting at the root and override it on a step:

```yaml
agents:
  queue: "linux-tests"

steps:
  - label: "Unit tests"
    command: "bash .buildkite/scripts/unit-tests.sh"

  - label: "Package release"
    command: "bash .buildkite/scripts/package.sh"
    agents:
      queue: "linux-release"
      docker: "true"
```

The first job targets `linux-tests`. The second requires an agent in `linux-release` with the requested Docker tag. Check the final uploaded definition, especially when a generator or shared configuration adds targeting rules.

Buildkite's [queue documentation](https://buildkite.com/docs/agent/queues) describes queue selection through the `agents` map. A queue's display name is not necessarily the exact key expected by the agent. Copy the queue key from its configuration and compare spelling and capitalization.

Also check whether a queue is self-hosted or Buildkite hosted. A self-hosted agent cannot provide capacity to a hosted queue simply by copying its name into a tag.

## Verify cluster membership and registration

Modern clustered self-hosted agents register using the appropriate cluster's token and listen on one queue within that cluster. Before launching them, the cluster and its queue must exist.

For example, an administrator can start an agent with an injected token and explicit tags:

```bash
buildkite-agent start \
  --tags 'queue=linux-release,docker=true,architecture=amd64'
```

This assumes the token is already supplied through the agent's normal secret configuration. Do not place the token in pipeline YAML or paste it into diagnostic output.

Inspect the registered agent in the Buildkite interface. Confirm its cluster, queue, tags, connection status, and whether it is idle. Do not rely only on what the service configuration file says: a process that has not restarted may still advertise an older configuration.

Some older articles describe unclustered agents listening to multiple queues. That is a deprecated model and should not be copied into a clustered setup. A job in one cluster does not match an identically named queue in another cluster.

## Find accidental tag constraints

Agent rules constrain eligibility. A job requesting `docker: "true"` will not become eligible merely because Docker is installed on a host; the agent must advertise the corresponding tag.

Add a temporary diagnostic command to the same queue with only the minimum targeting needed:

```yaml
steps:
  - label: "Release queue probe"
    command: "buildkite-agent --version"
    agents:
      queue: "linux-release"
```

If this job starts but the original job does not, compare the additional tags on the original. Restore rules one at a time until the mismatch is identified. Use a harmless command, and check the agent and repository hooks too: hooks still run for the probe and can exercise deployment privileges or override its command.

Check generated values too. A misspelled architecture, empty environment substitution, or string with trailing whitespace can narrow the eligible set to zero. Display the generated YAML with a dry run before uploading it.

## Inspect the agent service

On a systemd-managed Linux host, the following commands are useful when your installation uses the standard service name:

```bash
sudo systemctl status buildkite-agent --no-pager
sudo journalctl -u buildkite-agent -n 100 --no-pager
```

Adapt the service name to the installation. Look for registration failures, invalid queues, token errors, connection problems, pauses, and shutdown activity. A cloud instance being healthy does not prove that its agent registered successfully.

On Kubernetes, inspect pending or crash-looping agent pods and the controller logs. A controller that sees queued work can still fail to launch pods because of resource quotas, node capacity, image pulls, or scheduling constraints.

## Measure capacity after matching succeeds

If every matching agent is busy, the queue may need more workers or shorter jobs. Compare the queue's oldest waiting job, connected idle agents, and the time from machine launch to agent registration.

Remember that one host may run multiple agent processes, but CPU, memory, disk, and Docker contention can make their combined throughput worse. Measure completed jobs and queue delay rather than assuming agent count equals useful capacity.

Queue isolation should reflect different trust, toolchain, or resource requirements. Too many tiny queues can strand idle capacity while another queue grows. Consolidating compatible work may help more than increasing every pool.

## Conclusion

Prove the job matches a connected agent before changing capacity. Cluster, queue, tags, service health, and scheduler state explain most persistent waiting jobs and point to a specific correction.

## Official Documentation

- [Queues overview and targeting](https://buildkite.com/docs/agent/queues)
- [Agent configuration](https://buildkite.com/docs/agent/self-hosted/configure)
- [Command step agent rules](https://buildkite.com/docs/pipelines/configure/step-types/command-step)
- [Controlling concurrency](https://buildkite.com/docs/pipelines/configure/workflows/controlling-concurrency)
