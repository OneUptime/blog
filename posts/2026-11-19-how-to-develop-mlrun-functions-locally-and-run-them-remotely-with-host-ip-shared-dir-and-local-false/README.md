# How to Develop MLRun Functions Locally and Run Them Remotely with `HOST_IP`, `SHARED_DIR`, and `local=False`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLOps, Python, Kubernetes, Troubleshooting

Description: Separate local Docker network and storage settings from remote MLRun execution, then submit a version-aligned job with local=False.

Developing an MLRun function on a laptop involves several independent choices: where the client runs, where the MLRun API lives, where the function executes, and where its files are stored. Confusing those choices often produces a job that works in a notebook but fails when submitted remotely.

`HOST_IP`, `SHARED_DIR`, and `local=False` belong to different parts of that arrangement. Setting all three does not automatically connect a laptop directory to a remote Kubernetes cluster.

## Understand the local Docker variables

The versioned MLRun 1.6 Docker installation guide uses `HOST_IP` for addresses advertised by the local stack and `SHARED_DIR` for host storage mounted into its containers. Its instructions specifically require a reachable host address rather than `localhost` or `127.0.0.1`. Treat this as configuration for that documented Docker setup, not as a universal requirement for every MLRun installation. [MLRun 1.6 local Docker guide](https://docs.mlrun.org/en/v1.6/install/local-docker.html)

For an installation using that setup, the shell values might look like this:

```bash
# Replace with the address reachable from the relevant containers.
export HOST_IP=192.0.2.10
export SHARED_DIR="$HOME/mlrun-data"
mkdir -p "$SHARED_DIR"
```

The address above is a documentation placeholder. Use the networking instructions for your host and container platform. A connection from your browser to a published localhost port does not prove that a function container can reach the advertised callback address.

Likewise, a host directory only becomes available inside containers through the configured mounts. A remote cluster does not gain access to that directory because the client exports `SHARED_DIR`.

## Connect the client to the intended API

For an existing remote MLRun cluster, obtain its client settings from the platform and use a compatible client version. The documented API endpoint variable is `MLRUN_DBPATH`. [MLRun client setup](https://docs.mlrun.org/en/stable/setup-guide.html)

```bash
export MLRUN_DBPATH=https://mlrun-api.example.com
```

Configure authentication through the deployment's supported secret or environment mechanism. In an already running notebook, changing the shell environment elsewhere will not change the kernel's environment. Restart the kernel or apply the documented in-process configuration and reload it.

Check the effective endpoint without printing credentials:

```python
from urllib.parse import urlsplit
import mlrun

endpoint = urlsplit(mlrun.mlconf.dbpath)
print("API host:", endpoint.hostname)
print("Client version:", mlrun.__version__)
```

If the host is still a local Docker service, fix the client connection before investigating remote pods. A correct endpoint is necessary, but it does not establish compatibility or authorize access by itself.

## Start with a small job function

Save this ordinary Python module as `where.py` in the project directory:

```python
import os
import socket


def where(context):
    context.log_result("hostname", socket.gethostname())
    context.log_result("working_directory", os.getcwd())
```

The following contextual example assumes `project` is your connected MLRun project and `approved_image` is a registry image containing the MLRun runtime compatible with your cluster:

```python
project.set_function(
    "where.py",
    name="where",
    kind="job",
    image=approved_image,
    handler="where",
)
run = project.run_function("where", local=False)
```

The project API supports creating a function from a single file and choosing local versus runtime execution with `local`. A `job` runtime executes the function in a Kubernetes pod. [MLRun project API](https://docs.mlrun.org/en/stable/api/mlrun.projects/index.html)

Inspect the resulting run and its pod alongside the logged hostname. This establishes where execution happened before you introduce training data, additional packages, or complex imports. The examples describe the documented workflow; they have not been executed against your deployment.

## Package the dependencies and data deliberately

The single Python file does not represent every dependency of a real project. Package imported modules through the project's supported source or image build workflow, and include required Python and native libraries in the runtime environment. A package installed only in the laptop kernel will not necessarily exist in the remote image. [MLRun function image builds](https://docs.mlrun.org/en/stable/runtimes/image-build.html)

Use storage URLs or cluster-mounted storage for remote inputs and outputs. Confirm access from the job's identity. A local path such as `/Users/developer/data/train.csv` is meaningful on the laptop and usually meaningless inside a Kubernetes pod.

When the smoke test succeeds, add dependencies and data access incrementally. Diagnose API connection failures, image preparation failures, pod scheduling failures, and application exceptions at their respective boundaries. This keeps a change to `local=False` from becoming an unexplained collection of networking, packaging, and storage changes.
