# How to Fix OpenStack CCM x509 Errors with a Custom CA Bundle

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenStack, TLS, Security, Troubleshooting

Description: Repair OpenStack cloud controller TLS trust by mounting a CA bundle, configuring ca-file, and verifying the controller can reconcile Services.

---

A private OpenStack cloud can use certificates issued by an organization CA that the cloud controller container does not trust. The resulting `x509: certificate signed by unknown authority` error can prevent authentication to Keystone or later calls to Octavia, Neutron, or Nova. Restarting Kubernetes Services does not change that trust relationship.

The repair has two parts: make the correct CA certificates available inside the controller container, and point its OpenStack client at that bundle. This walkthrough uses the configuration behavior in OpenStack Cloud Controller Manager (OCCM) v1.36.0. Adapt the workload name to your installed chart or manifests.

## Identify which connection failed

Start with controller logs and Service events. Discover the controller before assuming that it is a Deployment; the upstream manifests also provide a DaemonSet.

```bash
kubectl -n kube-system get deployments,daemonsets,pods
kubectl -n kube-system logs pod/OCCM_POD --since=15m
kubectl -n production describe service web
```

Replace `OCCM_POD` with a controller pod. Record the hostname in the failing URL, the timestamp, and the certificate error. An unknown authority error points toward trust. An expired certificate or a certificate valid for a different hostname requires fixing the endpoint certificate or URL. Adding more CA certificates does not repair either condition.

Also distinguish the Kubernetes API connection from the OpenStack API connection. A failure against the Kubernetes API server uses the pod's Kubernetes client configuration. The `[Global] ca-file` option controls the OpenStack client and is not a general replacement for every certificate used by the process.

## Verify the CA bundle before deploying it

Obtain the organization's trusted CA certificates through your normal infrastructure distribution channel. A bundle should contain PEM certificates, not a server private key. Check the endpoint using its real DNS name so that both trust and hostname verification run:

```bash
openssl s_client \
  -connect identity.cloud.example:443 \
  -servername identity.cloud.example \
  -CAfile ./openstack-ca-bundle.pem \
  -verify_hostname identity.cloud.example \
  -verify_return_error </dev/null
```

Run the equivalent check against the Octavia endpoint reported by your cloud's service catalog. A successful workstation test establishes that the bundle can validate that endpoint; it does not establish that the controller pod has the same file or network path.

In the [v1.36.0 client implementation](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/client/client.go), an explicit CA file supplies the TLS root pool. Treat the bundle as the complete trust material required by the OpenStack endpoints used by that client. If some endpoints use public CAs and others use a private CA, account for both chains rather than assuming the container's default pool is always added automatically.

## Mount the bundle and reference its container path

A ConfigMap is appropriate for public CA certificates. Create a dedicated object so it can be updated independently of credential material:

```bash
kubectl -n kube-system create configmap openstack-ca \
  --from-file=ca-bundle.pem=./openstack-ca-bundle.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```

Add the following entries to the existing controller pod template. This is a fragment to merge into the installed Deployment or DaemonSet, retaining its existing arguments, mounts, and volumes:

```yaml
spec:
  template:
    spec:
      containers:
        - name: openstack-cloud-controller-manager
          volumeMounts:
            - name: openstack-ca
              mountPath: /etc/openstack-ca
              readOnly: true
      volumes:
        - name: openstack-ca
          configMap:
            name: openstack-ca
```

Then update the controller's existing `cloud.conf` configuration:

```ini
[Global]
auth-url=https://identity.cloud.example/v3
region=RegionOne
ca-file=/etc/openstack-ca/ca-bundle.pem
tls-insecure=false
```

Keep your existing authentication settings in that file. The example deliberately omits credentials. Store the completed configuration through the same Secret, Helm values, or external secret mechanism that already manages the controller. Confirm its `--cloud-config` argument reads that configuration file.

The [OCCM configuration reference](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/using-openstack-cloud-controller-manager.md#global) documents `ca-file`, client certificate settings, and `tls-insecure`. Disabling verification removes the identity check that makes HTTPS useful, so leave it false after correcting the trust chain.

## Restart and verify the actual controller

Roll out the configuration using the deployment system that owns it. For an upstream-style DaemonSet, the commands are:

```bash
kubectl -n kube-system rollout restart daemonset/openstack-cloud-controller-manager
kubectl -n kube-system rollout status daemonset/openstack-cloud-controller-manager
kubectl -n kube-system get pods -o wide
```

Use `deployment/NAME` instead if appropriate. A projected ConfigMap can change on disk while a running OpenStack client still retains its initialized TLS configuration; replacing the pods makes the reload explicit.

Inspect a new pod's volume definitions and controller logs. If the image contains a shell and certificate tools, validate the mounted bundle there. Otherwise use an approved diagnostic container with the same bundle and relevant networking. A debug container's trust store is separate from the controller's, so always point the check at the mounted file explicitly.

Verify a previously failing Service reconciles, obtains the expected load balancer status, and responds from a real client. If authentication succeeds but Octavia still reports x509 failures, inspect the Octavia certificate chain rather than repeatedly replacing the Keystone certificate.

## Conclusion

An OCCM CA repair is complete when the running controller trusts the required OpenStack endpoint chains and successfully reconciles cloud resources. Keep the CA bundle, its mount, and `ca-file` in the same deployment change so a later rollout cannot silently lose the fix.

## Official Documentation

- [OCCM authentication and CA configuration](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/using-openstack-cloud-controller-manager.md#global)
- [OpenStack client TLS implementation](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/client/client.go)
- [Kubernetes ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
