# Fix TeamCity No Compatible Agents Without Hiding Missing Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, DevOps

Description: Diagnose TeamCity agent eligibility in order: connection, authorization, pools, requirement mismatches, unresolved parameters, and actual tool access.

A build waits in TeamCity while an agent appears online. Restarting the agent changes nothing. Adding another machine also changes nothing. The missing fact is that being connected does not mean an agent is eligible for this particular build.

Treat the queue message as the beginning of an eligibility investigation. Separate administrative availability, project access, configuration requirements, and real tool readiness. Fix the first failing condition rather than deleting requirements until the build starts somewhere unsuitable.

This guide follows the TeamCity On-Premises 2026.2 documentation. UI labels can vary with the interface and server version; the examples concern classic build configurations rather than assuming that every pipeline setting has the same location.

## Establish whether the agent can receive normal work

Open the agent's details and record its connection, authorization, enabled state, and current build. These states answer different questions. An agent can be connected but unauthorized, or authorized but disabled for ordinary queued work. The [agent lifecycle documentation](https://www.jetbrains.com/help/teamcity/install-and-start-teamcity-agents.html) explains these distinctions and the licensing limit on authorized agents.

If the agent is disconnected, inspect its logs and configured server address before investigating build requirements. If it is unauthorized, verify the machine's identity and authorize it through the normal administration process. Do not authorize an unfamiliar machine solely to clear a queue.

If compatible agents are merely busy, the problem is capacity or scheduling rather than incompatible capabilities. Capture the exact queue explanation and compare it with the agent's current workload. A phrase about no *idle* compatible agents should not automatically be interpreted as proof that no compatible agent exists.

## Check the project's pool access

An agent pool is a group of agents assigned to projects. A project can use multiple pools, while an agent belongs to one pool. The [pool documentation](https://www.jetbrains.com/help/teamcity/configuring-agent-pools.html) describes that association and its effect on where project builds may run.

Confirm both sides: which pool contains the intended agent, and whether the build's project can use that pool. A machine can satisfy every technical requirement and still be outside the project's available pool set.

Do not move the agent into another pool casually. That can remove capacity from projects that used its previous pool. Prefer the narrow administrative correction that matches your intended ownership model, then recheck the affected projects.

## Read the actual mismatch

Use the build configuration's **Agent Requirements** page and the agent's **Compatible Configurations** information. The [agent details guide](https://www.jetbrains.com/help/teamcity/viewing-build-agent-details.html) also identifies where to inspect reported parameters, supported runners, and logs.

For each failure, write down the parameter name, condition, expected value, and reported value. “Java is installed” is too vague. The configuration might require a particular JDK parameter, operating system, or runner capability that the agent does not report.

A useful investigation record looks like this:

| Evidence | Meaning | Next action |
|---|---|---|
| Agent disconnected | Server cannot currently use the process. | Check agent process, address, network, and logs. |
| Unauthorized agent | Administrative trust or license allocation is unresolved. | Verify identity and authorization capacity. |
| Project lacks pool access | Correct machine is outside the project boundary. | Review project-to-pool assignment. |
| Explicit requirement mismatch | Reported parameter fails a configured condition. | Correct the requirement or the machine capability. |
| Unresolved parameter reference | Configuration expects a value nobody supplied. | Define it at the intended scope. |
| Compatible but command fails | Scheduling metadata did not prove runtime readiness. | Inspect the actual execution environment. |

## Separate explicit, inherited, and automatic requirements

Requirements may be written directly, inherited from a template, inferred from runner settings, or introduced by unresolved parameter references. JetBrains documents these categories in [Configuring Agent Requirements](https://www.jetbrains.com/help/teamcity/configuring-agent-requirements.html).

Do not edit only the visible build configuration without checking its template. An inherited or enforced requirement may be the real source. Likewise, removing a manually added Docker condition will not make a container-wrapped step independent of a container engine.

Requirements combine as logical AND. Requiring both a Windows operating system and a Linux-only capability is not a way to offer two alternatives. Split genuinely different execution paths or define a truthful shared capability that both intended agent classes provide.

This Kotlin DSL fragment belongs inside an existing `BuildType` body. It uses the documented [Requirements API](https://www.jetbrains.com/help/teamcity/kotlin-dsl-documentation/root/requirements/):

```kotlin
requirements {
    equals("teamcity.agent.jvm.os.name", "Linux")
    exists("env.JDK_21_0")
}
```

The intent is a Linux agent reporting the JDK 21 location parameter. Check the actual parameter names reported by your agents before using it. This fragment does not install Java, select that Java for every runner, or verify that the reported directory contains a working executable. Configure the runner's JDK selection separately.

## Resolve accidental parameter requirements at the right scope

Suppose a custom script contains `%release.channel%`, but the configuration and project do not define that parameter. TeamCity can interpret the unresolved reference as something the agent must provide. A release setting has accidentally become an agent-selection condition.

If the release channel is configuration-owned, define it there. For a shell environment variable, use an `env.` parameter, as described in [Configuring Build Parameters](https://www.jetbrains.com/help/teamcity/configuring-build-parameters.html):

```kotlin
params {
    param("env.RELEASE_CHANNEL", "staging")
}
```

Then a Linux custom script can read the ordinary environment variable:

```bash
#!/bin/sh
set -eu
echo "Release channel: ${RELEASE_CHANNEL:?Set env.RELEASE_CHANNEL}"
```

This fails clearly if the variable is missing or empty. The sample value is not secret. Use an appropriate protected parameter type for sensitive values instead of printing them.

TeamCity also treats percent-delimited text in scripts as parameter references. A date format containing percent signs can therefore cause surprising substitution. The [Command Line documentation](https://www.jetbrains.com/help/teamcity/command-line.html) explains escaping literal percent signs by doubling them. Check whether a mysterious implicit requirement came from formatting syntax before adding a fabricated agent property.

## Verify tools in the agent's execution environment

An administrator's interactive shell can have a different PATH from the account or container running the agent. Use an approved diagnostic context on the intended agent, or a minimal diagnostic build that is already eligible there. Check only relevant tools:

```bash
#!/bin/sh
for tool in java node docker; do
    if command -v "$tool" >/dev/null 2>&1; then
        echo "$tool: found in this process PATH"
    else
        echo "$tool: missing from this process PATH"
    fi
done
```

This reports executable discovery only. Follow it with the specific version and access checks your build requires. A Docker executable does not prove access to a daemon. Java found on PATH may differ from the runner-selected JDK. A containerized build step may have a different environment again.

Do not dump the entire environment into shared logs; it may include credentials. And do not invent a tool-detection parameter merely to make compatibility turn green. If the software is missing, provision the agent image or host correctly and verify the server's refreshed parameter view.

## Confirm the repair with one representative build

After the narrow correction, verify that the intended agent is compatible, belongs to an allowed pool, and can receive work. Run a representative build and record the selected agent and relevant tool versions. A queue transition alone is not proof of a reproducible build environment.

Keep the failing condition and its correction in the incident record. That evidence turns a recurring “no agents” complaint into a specific provisioning, configuration, or capacity issue, and prevents the next fix from weakening the very requirement that protects the build.
