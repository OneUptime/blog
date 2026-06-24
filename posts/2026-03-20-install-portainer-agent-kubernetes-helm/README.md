# How to Install Portainer Agent on Kubernetes via Helm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Helm, Agent, DevOps

Description: Deploy the Portainer Agent on Kubernetes using Helm charts for centralized cluster management from a Portainer server.

---

Installing Portainer Agent on Kubernetes is a legacy option that does not support edge features or policy management. For most use cases, Portainer recommends the Edge Agent. To deploy the standard Kubernetes agent, use the Portainer-provided YAML manifests.

## Prerequisites

- `kubectl` configured for the target cluster
- Cluster Admin rights on the target cluster
- A running Portainer server instance
- If Portainer Server uses `AGENT_SECRET`, the same secret must be added to the agent deployment manifest

## Generate the Portainer Agent Manifest

1. In Portainer, navigate to **Environments > Add environment**
2. Select **Kubernetes** and click **Start Wizard**
3. Under **More options**, select **Agent**
4. Choose **Kubernetes via load balancer** or **Kubernetes via node port**
5. Copy the generated `kubectl apply -f ...` command and run it on the control node of your Kubernetes cluster

## Install the Portainer Agent

### Standard Agent (for Portainer Agent-based connection)

Use the generated Portainer command to apply the agent manifest to your cluster.

### Edge Agent (for Edge environments)

For Kubernetes Edge Agent deployments, create the environment in Portainer using **Kubernetes > Edge Agent Standard**, then copy and run the generated deployment command on your cluster. If your Portainer Server uses a self-signed certificate, enable **Allow self-signed certs** so the generated deployment includes `EDGE_INSECURE_POLL=1`.

## Verify the Installation

```bash
# Check the agent pod is running
kubectl get pods --namespace=portainer

# Check the Deployment
kubectl get deployment -n portainer portainer-agent

# View agent logs
kubectl logs -n portainer deployment/portainer-agent --tail=20
```

## Configure the Agent Manifest

If Portainer Server was started with `AGENT_SECRET`, add the same secret to the agent deployment manifest before applying it:

```yaml
env:
  - name: AGENT_SECRET
    value: "yoursecret"
```

Apply the updated manifest after making the change.

## Add the Kubernetes Environment to Portainer

After agent installation, complete the environment setup in Portainer:

1. Return to the Portainer wizard after running the generated deployment command
2. Enter a name for the environment
3. Enter the Kubernetes host or IP address and the appropriate port: `9001` for LoadBalancer or `30778` for NodePort
4. Do not include a protocol in the environment URL
5. Add the environment only once for the cluster

---

*Monitor your Kubernetes workloads with [OneUptime](https://oneuptime.com) after connecting to Portainer.*
