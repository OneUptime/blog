# How to Deploy Multiple CloudStack VMs in Parallel Through the API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, API, REST API, Virtual Machine, Virtualization, Troubleshooting

Description: Submit bounded parallel CloudStack VM deployments, persist asynchronous job IDs, reconcile ambiguous requests, verify every instance, and roll back by recorded UUID.

---

CloudStack's `deployVirtualMachine` command is asynchronous. A successful HTTP response means CloudStack accepted a job, not that the VM booted successfully. Reliable parallel deployment therefore needs two limits: a bounded number of outstanding deployment jobs and a persistent record connecting each intended VM name to its returned job ID and resource UUID.

Unbounded loops can exhaust capacity, saturate template or primary storage, trigger network allocation races, and make failures difficult to unwind. Blind HTTP retries are worse: if the management server accepted the first request but the response was lost, a retry can create a second VM.

## Preflight the Exact Inputs

Resolve human-readable choices into immutable UUIDs before starting the batch:

```bash
cmk list zones
cmk list serviceofferings
cmk list templates templatefilter=executable zoneid=ZONE_UUID
cmk list networks zoneid=ZONE_UUID
cmk list sshkeypairs
cmk list capacity zoneid=ZONE_UUID
```

Confirm that:

- the template is ready in the target zone and matches the hypervisor and architecture;
- the service offering fits as a contiguous allocation on enough eligible hosts;
- the network has IP/VLAN capacity and is accessible to the API caller;
- storage tags and host tags have eligible pools and hosts;
- account or project resource limits allow the full batch;
- the SSH key and user-data method are correct; and
- system VMs and virtual routers are healthy.

Aggregate free CPU or memory does not guarantee placement. Ten 8 GiB VMs cannot be allocated if free memory is fragmented across hosts in smaller chunks or affinity rules exclude the available hosts.

Deploy one disposable VM with these exact IDs first. Validate boot, networking, console, and cleanup before multiplying the operation.

## Use Deterministic Batch Names

Give every intended VM a stable name containing an operator-chosen batch identifier, for example `web-20260904a-01`. Re-running the same batch must reuse the same identifier. Keep the hostname within the template and network's naming rules.

Do not use only a timestamp generated at process startup. After a crash, a new timestamp defeats reconciliation and can create duplicates. CloudStack's `listVirtualMachines name=...` performs a substring match, so always filter the returned objects for an exact name and the expected account or project.

Root administrators may attach `customid` as a correlation marker, but CloudStack does not document it as unique or as a server-side idempotency key. Deterministic names are not idempotency keys either. Every caller still needs an exact-scope lookup and a locally persisted job ledger before retrying an ambiguous submission.

## A Bounded API Deployment Driver

The following Python 3 program keeps at most four deployment jobs outstanding. It signs API calls, records state atomically after every accepted request, polls `queryAsyncJobResult`, and refuses to guess when submission is ambiguous.

Save it as `deploy_batch.py` outside a public repository:

```python
#!/usr/bin/env python3
import base64
import hashlib
import hmac
import json
import os
import re
import tempfile
import time
from pathlib import Path
from urllib.parse import quote, quote_plus, urlencode

import requests


ENDPOINT = os.environ["CLOUDSTACK_API_URL"]
API_KEY = os.environ["CLOUDSTACK_API_KEY"]
SECRET_KEY = os.environ["CLOUDSTACK_SECRET_KEY"]
BATCH_ID = os.environ["BATCH_ID"]
ZONE_ID = os.environ["ZONE_ID"]
OFFERING_ID = os.environ["SERVICE_OFFERING_ID"]
TEMPLATE_ID = os.environ["TEMPLATE_ID"]
NETWORK_IDS = os.environ["NETWORK_IDS"]
PROJECT_ID = os.environ.get("PROJECT_ID")
COUNT = int(os.environ.get("VM_COUNT", "8"))
MAX_IN_FLIGHT = int(os.environ.get("MAX_IN_FLIGHT", "4"))
STATE_PATH = Path(os.environ.get("BATCH_STATE", f"{BATCH_ID}.json"))


if not ENDPOINT.startswith("https://"):
    raise SystemExit("Refusing to send credentials without HTTPS")
if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,30}", BATCH_ID):
    raise SystemExit("BATCH_ID must be stable, lowercase, and hostname-safe")
if COUNT < 1 or MAX_IN_FLIGHT < 1 or MAX_IN_FLIGHT > 10:
    raise SystemExit("Check VM_COUNT and use a conservative MAX_IN_FLIGHT")


def canonical(params):
    pairs = []
    for key in sorted(params, key=lambda item: item.lower()):
        encoded = quote_plus(str(params[key]), safe="").replace("+", "%20")
        pairs.append(f"{key.lower()}={encoded.lower()}")
    return "&".join(pairs)


def call(command, **arguments):
    params = {
        "command": command,
        "response": "json",
        "apikey": API_KEY,
        **{key: str(value) for key, value in arguments.items()},
    }
    digest = hmac.new(
        SECRET_KEY.encode("utf-8"),
        canonical(params).encode("utf-8"),
        hashlib.sha1,
    ).digest()
    params["signature"] = base64.b64encode(digest).decode("ascii")
    body = urlencode(params, quote_via=quote, safe="")
    response = requests.post(
        ENDPOINT,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=(5, 90),
    )
    response.raise_for_status()
    payload = response.json()
    if "errorresponse" in payload:
        error = payload["errorresponse"]
        raise RuntimeError(
            f"CloudStack error {error.get('errorcode')}: "
            f"{error.get('errortext')}"
        )
    return payload[f"{command.lower()}response"]


def load_state():
    if not STATE_PATH.exists():
        return {"batch": BATCH_ID, "vms": {}}
    state = json.loads(STATE_PATH.read_text())
    if state.get("batch") != BATCH_ID:
        raise RuntimeError("State file belongs to another batch")
    return state


def save_state(state):
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(
        dir=STATE_PATH.parent, prefix=f".{STATE_PATH.name}."
    )
    try:
        with os.fdopen(fd, "w") as stream:
            json.dump(state, stream, indent=2, sort_keys=True)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary_name, STATE_PATH)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)


def expected_names():
    return [f"web-{BATCH_ID}-{number:02d}" for number in range(1, COUNT + 1)]


def find_exact_vm(name):
    arguments = {"name": name, "listall": "true"}
    if PROJECT_ID:
        arguments["projectid"] = PROJECT_ID
    response = call("listVirtualMachines", **arguments)
    matches = [
        vm for vm in response.get("virtualmachine", [])
        if vm.get("name") == name
    ]
    if len(matches) > 1:
        raise RuntimeError(f"Multiple exact matches already exist for {name}")
    return matches[0] if matches else None


state = load_state()

# A pre-submit marker survives a crash around the HTTP request. Both states
# require human reconciliation before this driver can safely submit again.
uncertain = [
    name for name, record in state["vms"].items()
    if record["status"] in {"submitting", "unknown"}
]
if uncertain:
    raise SystemExit(f"Reconcile uncertain submissions first: {uncertain}")

while True:
    in_flight = {
        name: record
        for name, record in state["vms"].items()
        if record["status"] == "pending"
    }

    for name in expected_names():
        if len(in_flight) >= MAX_IN_FLIGHT:
            break
        if name in state["vms"]:
            continue

        existing = find_exact_vm(name)
        if existing:
            state["vms"][name] = {
                "status": "existing",
                "vmid": existing["id"],
            }
            save_state(state)
            continue

        arguments = {
            "zoneid": ZONE_ID,
            "serviceofferingid": OFFERING_ID,
            "templateid": TEMPLATE_ID,
            "networkids": NETWORK_IDS,
            "name": name,
            "displayname": name,
            "startvm": "true",
        }
        if PROJECT_ID:
            arguments["projectid"] = PROJECT_ID

        # Persist intent before sending. If the process dies after this write,
        # the next run stops instead of assuming no request reached CloudStack.
        state["vms"][name] = {"status": "submitting"}
        save_state(state)

        try:
            accepted = call("deployVirtualMachine", **arguments)
            jobid = accepted["jobid"]
        except requests.RequestException as error:
            state["vms"][name] = {
                "status": "unknown",
                "reason": type(error).__name__,
            }
            save_state(state)
            raise SystemExit(
                f"Ambiguous submission for {name}; do not retry automatically"
            ) from error
        except (KeyError, TypeError, ValueError) as error:
            state["vms"][name] = {
                "status": "unknown",
                "reason": type(error).__name__,
            }
            save_state(state)
            raise SystemExit(
                f"Unusable response for {name}; reconcile before retrying"
            ) from error
        except RuntimeError as error:
            # call() raises RuntimeError only for an explicit CloudStack error
            # response, so this submission is known to have failed.
            state["vms"][name] = {
                "status": "failed",
                "error": str(error),
            }
            save_state(state)
            raise SystemExit(f"CloudStack rejected {name}: {error}") from error

        record = {
            "status": "pending",
            "jobid": jobid,
            "vmid": accepted.get("id"),
        }
        state["vms"][name] = record
        in_flight[name] = record
        save_state(state)
        print(f"accepted {name}: job {record['jobid']}")

    in_flight = {
        name: record
        for name, record in state["vms"].items()
        if record["status"] == "pending"
    }
    if not in_flight:
        if all(name in state["vms"] for name in expected_names()):
            break
        continue

    time.sleep(10)
    for name, record in list(in_flight.items()):
        job = call("queryAsyncJobResult", jobid=record["jobid"])
        status = int(job["jobstatus"])
        if status == 0:
            continue
        if status == 1:
            record["status"] = "succeeded"
            record["vmid"] = record.get("vmid") or job.get("jobinstanceid")
            print(f"succeeded {name}: VM {record.get('vmid')}")
        elif status == 2:
            record["status"] = "failed"
            record["errorcode"] = job.get("jobresultcode")
            record["error"] = job.get("jobresult")
            print(f"failed {name}: {record['errorcode']}")
        else:
            raise RuntimeError(f"Unexpected job status {status}")
        save_state(state)

summary = {record["status"] for record in state["vms"].values()}
print(json.dumps(state, indent=2, sort_keys=True))
if "failed" in summary:
    raise SystemExit("One or more deployments failed; inspect before retrying")
```

The example writes a `submitting` marker before each request, then replaces it with the returned job ID. A crash anywhere around the request therefore leaves a state that demands reconciliation instead of silently resubmitting. It does not auto-retry CloudStack errors: capacity and configuration failures need a diagnosis, while transport or malformed-response failures need reconciliation. It also deliberately keeps `MAX_IN_FLIGHT` conservative. Increase it only after measuring management-server, network, storage, and template-download behavior.

For an internal CA, configure Requests with `verify="/path/to/ca.pem"` or set `REQUESTS_CA_BUNDLE=/path/to/ca.pem`. Never use `verify=False`.

## Run One Named Batch

Protect the state file and credentials from other users:

```bash
umask 077
export CLOUDSTACK_API_URL=https://cloud.example.net/client/api
export CLOUDSTACK_API_KEY=REDACTED_API_KEY
read -r -s CLOUDSTACK_SECRET_KEY
export CLOUDSTACK_SECRET_KEY
export BATCH_ID=20260904a
export ZONE_ID=ZONE_UUID
export SERVICE_OFFERING_ID=SERVICE_OFFERING_UUID
export TEMPLATE_ID=TEMPLATE_UUID
export NETWORK_IDS=NETWORK_UUID
export PROJECT_ID=PROJECT_UUID
export VM_COUNT=8
export MAX_IN_FLIGHT=4
export BATCH_STATE=/secure/operator-state/cloudstack-20260904a.json
python deploy_batch.py
unset CLOUDSTACK_SECRET_KEY
```

Do not put a private SSH key, API secret, database password, or long-lived credential in user data. Use a secret-delivery system appropriate for the guest after its identity is established.

## Reconcile an Ambiguous Submission

If the client times out after sending `deployVirtualMachine`, the script marks that name `unknown` and stops. A process or host crash can instead leave the durable pre-submit state as `submitting`. Treat both states as uncertain. Do not simply delete the state entry and rerun.

Search exact scope and recent async jobs:

```bash
cmk list virtualmachines name=web-20260904a-03 listall=true
cmk list asyncjobs listall=true
cmk list events keyword=web-20260904a-03
```

Because the name filter is a substring match, inspect returned `name`, `id`, `projectid`, `created`, template, and offering fields. If the VM exists, write its UUID into the protected ledger as reconciled. If a matching deployment job is still pending, record and poll that job. Only resubmit after proving that neither a VM nor an accepted job exists.

If the old request can appear late because of a proxy timeout or queue, wait beyond that boundary before retrying. CloudStack query API signatures are authentication, not an idempotency token.

## Verify Every Result

An async status of `1` proves the deployment job completed successfully. It does not prove the application is healthy. Compare the ledger with CloudStack:

```bash
cmk list virtualmachines projectid=PROJECT_UUID listall=true
cmk list volumes virtualmachineid=VM_UUID
cmk list nics virtualmachineid=VM_UUID
cmk list events keyword=web-20260904a
```

For each VM, verify:

- exact name and UUID are unique;
- zone, template, service offering, network, and project match the plan;
- state becomes `Running` when `startvm=true`;
- root and requested data volumes are ready;
- NICs received expected addresses;
- SSH host identity and application health pass; and
- monitoring and backup enrollment completed.

Use guest or load-balancer health checks with a deadline. Do not mark the batch complete because all CloudStack jobs are green while cloud-init or application bootstrap is still failing.

## Handle Partial Failure

Leave successful VMs alone while diagnosing the first failed job:

```bash
cmk query asyncjobresult jobid=FAILED_JOB_UUID
sudo grep -nE 'FAILED_JOB_UUID|VM_UUID' \
  /var/log/cloudstack/management/management-server.log | tail -n 300
```

Common causes include contiguous CPU/RAM shortage, resource limits, exhausted guest IPs, host or storage tag mismatches, template not ready on an eligible path, affinity constraints, and storage latency. Reducing parallelism can relieve transient pressure, but it cannot correct an impossible placement constraint.

Do not automatically replace only the failed entry with a new random name. Fix the cause, prove the old job is terminal, retain the same deterministic name, and start a controlled continuation using the same state file.

## Roll Back by UUID, Not Name

Review the state ledger and CloudStack response before destroying anything. Roll back only VMs created by this batch, excluding records marked `existing`. For each recorded UUID:

```bash
cmk list virtualmachines id=VM_UUID listall=true
cmk destroy virtualmachine id=VM_UUID expunge=false
cmk query asyncjobresult jobid=DESTROY_JOB_UUID
```

`expunge=false` preserves the recovery window governed by CloudStack policy. Expunge is destructive and should not be part of automatic rollback. Confirm what happens to separately attached data volumes, IP addresses, snapshots, and external DNS/load-balancer records before cleanup.

If a VM contains useful diagnostics, stop it and preserve its logs rather than destroying it immediately. Keep the ledger with the incident record until every resource and job has been reconciled.

## Troubleshooting Parallel Runs

- **Jobs stay pending:** check management-server queues, host/storage health, system VMs, and whether a long storage operation is blocking allocation. Continue bounded polling with backoff.
- **Many jobs fail with capacity errors:** stop submitting, inspect per-host contiguous capacity and placement constraints, then lower the batch or correct the offering.
- **Duplicate names appear:** the client retried an ambiguous request or used a new batch ID. Freeze the automation and reconcile UUIDs before choosing which instance to keep.
- **API returns 429 or a throttle error:** honor the limit, reduce polling and submission rates, and add randomized backoff. Do not open more concurrent clients.
- **VM is `Running` but bootstrap failed:** inspect console, network, metadata/user-data, DNS, repository access, and cloud-init logs. Do not redeploy until duplicate prevention is in place.
- **Only later VMs fail networking:** inspect network IP capacity, virtual router health, DHCP leases, and security groups rather than retrying deployment.

## Conclusion

Parallel CloudStack deployment is a queue-management problem, not a shell loop. Resolve UUIDs first, use deterministic names and a protected ledger, cap outstanding asynchronous jobs, reconcile every uncertain submission, and verify the application after CloudStack reports success. A UUID-based, non-expunging rollback keeps partial failures recoverable and prevents collateral deletion.

## Official Documentation

- [Apache CloudStack: deployVirtualMachine API](https://cloudstack.apache.org/api/apidocs-4.23/apis/deployVirtualMachine.html)
- [Apache CloudStack: queryAsyncJobResult API](https://cloudstack.apache.org/api/apidocs-4.23/apis/queryAsyncJobResult.html)
- [Apache CloudStack: listVirtualMachines API](https://cloudstack.apache.org/api/apidocs-4.23/apis/listVirtualMachines.html)
- [Apache CloudStack: Programmer Guide and Asynchronous Commands](https://docs.cloudstack.apache.org/en/latest/developersguide/dev.html)
- [Apache CloudStack: destroyVirtualMachine API](https://cloudstack.apache.org/api/apidocs-4.23/apis/destroyVirtualMachine.html)
