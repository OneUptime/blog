# Cloudability Has No Container Data: Debugging FinOps Agent RBAC, 30-Second Scrapes, and 10-Minute Exports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Kubernetes, Troubleshooting, Kubernetes RBAC

Description: Diagnose missing Cloudability container data through deployed agent versions, Kubernetes RBAC, collection timing, upload stages, and billing correlation.

A healthy-looking FinOps Agent pod does not prove that Cloudability has usable container cost data. Collection, local storage, authentication, upload, and billing correlation are separate stages, and any one can break the path.

Also verify the timing assumptions in the incident report. “30-second scrapes and 10-minute exports” is not a universal contract across agent versions. Investigate the deployed configuration before declaring the agent late.

## Capture the actual deployment

Start with read-only Kubernetes checks, substituting your namespace and pod name:

```bash
kubectl get pods -n ibm-finops-agent -o wide
kubectl get deployment -n ibm-finops-agent
kubectl get pvc -n ibm-finops-agent
kubectl describe pod -n ibm-finops-agent AGENT_POD
kubectl logs -n ibm-finops-agent AGENT_POD --all-containers --since=30m
```

Record the image tag, chart version, cluster ID, restart count, scheduling events, and persistent-volume status. Inspect logs before restarting a failing pod so the original failure sequence is preserved. If it has restarted, `kubectl logs --previous` can retrieve the previous container's output where available.

IBM provisions the agent per cluster with Helm and documents a persistent volume, outbound Cloudability/Frontdoor/S3 access, and provider-specific prerequisites. [Kubernetes cluster provisioning](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=cloudability-kubernetes-cluster-provisioning)

## Verify timing against the installed chart

At the reviewed official chart revision, the values file specifies `agent.collectorDataSource.scrapeInterval: 60s`, allocation exports at `10m`, and `agent.cloudability.emissionInterval: 3m`. Those settings describe different stages. They should not be collapsed into one upload guarantee. [Pinned FinOps chart values](https://github.com/kubecost/finops-agent-chart/blob/8368790c259419f168ac97cfccdc35571737ba97/charts/finops-agent/values.yaml)

Your installed release may use another version or override. Compare its non-secret effective settings with that version's values and templates. Helm output can contain credentials, so do not paste a complete values dump into an incident channel.

Use timestamps to distinguish “no samples collected” from “samples queued but not uploaded.” Repeated failures at a consistent interval are evidence about the stage being exercised, not proof that increasing the interval will fix it.

## Check Kubernetes authorization with the actual identity

Find the service account used by the pod:

```bash
kubectl get pod -n ibm-finops-agent AGENT_POD \
  -o jsonpath='{.spec.serviceAccountName}{"\n"}'
```

Then inspect the installed Role/ClusterRole bindings and compare them with the chart version's RBAC template. Test the denied operation named in the logs. For example, if node listing fails:

```bash
kubectl auth can-i list nodes \
  --as=system:serviceaccount:ibm-finops-agent:AGENT_SERVICE_ACCOUNT
```

This command requires the operator to be allowed to impersonate that identity. Replace the service-account placeholder; testing your own administrative identity would answer the wrong question. A successful node-list check also does not establish every permission the agent needs. [Kubernetes authorization checks](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)

Do not make the running agent cluster-admin to suppress a single forbidden error. Restore the documented chart permissions and identify any local policy or binding that prevents them from taking effect.

## Follow the upload stages independently

IBM's troubleshooting article describes a 10-minute upload failure pattern with three requests: Frontdoor authentication, obtaining a presigned S3 URL, and uploading the sample to S3. [FinOps Agent troubleshooting](https://www.ibm.com/support/pages/node/7269442)

Use that sequence to classify the failure:

| Evidence | Next investigation |
| --- | --- |
| Authentication rejected | Access key, secret, environment, and uploader permissions |
| Login works; upload URL request fails | Regional endpoint, authorization, network path |
| URL obtained; object PUT fails | S3 destination connectivity, proxy, TLS, response code |
| Upload succeeds; report remains empty | Cluster identity and billing correlation |

A successful request to the Cloudability API host does not prove the S3 destination is reachable. Test the documented destinations from the agent's network context. Preserve status codes and timestamps while redacting keys, authorization headers, and signed URLs.

Check that the configured Frontdoor environment corresponds to the intended Cloudability environment. IBM also documents distinct provisioning and uploading permissions; installation access alone is not sufficient evidence of upload access. [Cloudability roles and permissions](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=administration-roles-permissions-in-cloudability)

## Confirm billing correlation after delivery

Successful uploads still need the corresponding cloud billing data. For GKE, IBM requires the documented cluster label and mapping so telemetry can be associated with billing line items. Inspect billing freshness and the cluster identifier before repeatedly reinstalling the agent. [Cloudability container troubleshooting](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=allocation-cloudability-advanced-containers)

Close the incident only after a known cluster and namespace appear for the expected period, not merely after the pod becomes Ready. Save the relevant version, timing, and identity facts in the runbook so the next investigation begins with the actual deployment contract.

## Conclusion

Trace missing data from collection through billing correlation. Version-aware timing, operation-specific RBAC checks, and separate authentication/upload evidence reveal failures far more reliably than restarting a pod and waiting an arbitrary ten minutes.
