# Add a Load-Balancer Address to kube-apiserver Certificates Without Breaking TLS SAN Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubeadm, Kubernetes API Server, Load Balancer, TLS, Certificate, X.509, High Availability

Description: Add a load-balancer DNS name or IP to kubeadm API server certificates with configuration synchronization, per-node regeneration, and rolling TLS verification.

---

Pointing kubeconfig at a new load-balancer address can fail with `x509: certificate is valid for ..., not ...` even when the load balancer reaches healthy API servers. The client verifies the hostname or IP in the URL against the serving certificate's Subject Alternative Names (SANs). DNS records and Common Names do not override that check.

For a kubeadm-managed, TLS-pass-through control plane, add the address to `ClusterConfiguration.apiServer.certSANs`, generate new API server serving certificates, and roll them one node at a time. Do not disable verification or set `insecure-skip-tls-verify`.

## Determine Which Layer Terminates TLS

Inspect the certificate presented by the new endpoint:

```bash
openssl s_client -connect api.example.net:6443 \
  -servername api.example.net </dev/null 2>/dev/null |
  openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```

If the load balancer terminates TLS, its certificate—not kube-apiserver's—must cover the public name, and the backend TLS/authentication design requires separate review. The procedure below applies when the load balancer passes TLS through and clients receive a kube-apiserver certificate.

Confirm that the load balancer is already reachable, forwards to every intended control-plane backend, and uses readiness-aware health checks. In an HA cluster, the load-balancer address should match kubeadm's `controlPlaneEndpoint`. Adding a field or certificate does not convert an unsupported single-control-plane topology into HA.

## Inventory Configuration and Existing SANs

Export the cluster-wide kubeadm configuration and inspect it:

```bash
umask 077
kubectl -n kube-system get configmap kubeadm-config \
  -o jsonpath='{.data.ClusterConfiguration}' \
  > /root/kubeadm-cluster.yaml

sudo kubeadm version
sudo kubeadm config validate --config=/root/kubeadm-cluster.yaml
```

Use the configuration API supported by the **installed** kubeadm. If the stored document uses an older supported API, `kubeadm config migrate` can render the newer form; review the result rather than changing only the `apiVersion` string.

On every control-plane node, record the current certificate SANs and checksum:

```bash
sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt \
  -noout -subject -issuer -dates -ext subjectAltName
sudo sha256sum /etc/kubernetes/pki/apiserver.crt
```

Preserve all required existing custom SANs. A DNS address belongs in a DNS SAN; a literal IP belongs in an IP SAN. Do not include a port in `certSANs`.

## Update the Desired kubeadm Configuration

The relevant shape for the current kubeadm v1beta4 API is:

```yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
controlPlaneEndpoint: "api.example.net:6443"
apiServer:
  certSANs:
    - api.example.net
    - 10.0.0.50
    # Retain any existing custom SANs.
```

Keep the rest of the exported `ClusterConfiguration`, including networking, etcd, image, and component settings. Validate the edited file. Then update `data.ClusterConfiguration` in the `kube-system/kubeadm-config` ConfigMap through your reviewed change process. Kubernetes' reconfiguration guide requires the persisted desired configuration and node files to be kept in sync; editing the ConfigMap alone does not replace certificates on disk.

For each node, provide its local API endpoint as an `InitConfiguration` document if automatic interface detection could select the wrong address:

```yaml
---
apiVersion: kubeadm.k8s.io/v1beta4
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: 10.0.0.11
  bindPort: 6443
```

That address is node-specific. Build and validate a reviewed file for each replica.

## Regenerate; Do Not Merely Renew

`kubeadm certs renew apiserver` uses the existing certificate as the authoritative source for SANs. It extends/reissues what is already there and therefore does not add the new name from the ConfigMap.

The documented generation phase uses the supplied configuration, but it skips generation when both `/etc/kubernetes/pki/apiserver.crt` and `.key` already exist. On one control-plane node at a time:

1. Confirm the other replicas are ready and serving through the load balancer.
2. Remove the target backend from load-balancer rotation and let established connections drain according to the load balancer's documented behavior.
3. Back up `/etc/kubernetes` to a protected location outside the static Pod manifest directory.
4. Move the existing `apiserver.crt` and `apiserver.key` pair to that protected location.
5. Run the certificate generation phase with the reviewed node-specific configuration.
6. Inspect the new certificate before restarting kube-apiserver.

```bash
sudo install -d -m 0700 /root/kubernetes-pki-backup
sudo cp -a /etc/kubernetes /root/kubernetes-pki-backup/etc-kubernetes
sudo mv /etc/kubernetes/pki/apiserver.crt \
  /root/kubernetes-pki-backup/apiserver.crt.old
sudo mv /etc/kubernetes/pki/apiserver.key \
  /root/kubernetes-pki-backup/apiserver.key.old

sudo kubeadm init phase certs apiserver \
  --config=/root/kubeadm-node.yaml

sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt \
  -noout -subject -issuer -dates -ext subjectAltName
```

This requires the Kubernetes CA signing key in the kubeadm PKI directory. If the cluster uses external CA mode and `ca.key` is intentionally absent, stop and use the organization's external signing workflow with kubeadm-generated CSRs. Do not copy an offline CA key onto every node as an incident shortcut.

## Restart and Verify One Replica at a Time

The running API server may not dynamically reload this certificate. Restart its static Pod using the documented kubelet workflow: move `kube-apiserver.yaml` out of `/etc/kubernetes/manifests`, wait at least one configured `fileCheckFrequency` and confirm the container stopped, then move the same manifest back. Keep the temporary file outside the watched directory.

After the container returns, verify direct readiness and the certificate presented by that backend, using a certified name to reach its IP. Confirm the new SAN, correct issuer, expected validity period, and stable `/readyz=200`. Only then return the backend to rotation and repeat on the next node.

Finally test through the load balancer:

```bash
kubectl --server=https://api.example.net:6443 \
  get --raw='/readyz'
kubectl --server=https://api.example.net:6443 \
  get --raw='/version'
```

These commands retain credentials and CA data from the active kubeconfig while overriding only the server. Test multiple fresh connections, and use load-balancer logs, metrics, or another deterministic method to confirm that every backend is exercised; repeated connections alone do not guarantee backend coverage. Update long-lived kubeconfigs to the shared endpoint only after all replicas pass; changing their CA data is unnecessary when the same cluster CA signed the new certificates.

## Conclusion

TLS validates names, not load-balancer intent. Record existing SANs, synchronize kubeadm's desired configuration, regenerate rather than renew the serving certificate, and roll each replica with CA verification intact. External-CA and TLS-terminating designs need their own signing layer, never an insecure client workaround.

## Official References

- [Kubernetes: Reconfiguring a kubeadm Cluster](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-reconfigure/)
- [Kubernetes: Certificate Management with kubeadm](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/)
- [Kubernetes: kubeadm init phase certs apiserver](https://kubernetes.io/docs/reference/setup-tools/kubeadm/generated/kubeadm_init/kubeadm_init_phase_certs_apiserver/)
- [Kubernetes: kubeadm Configuration API](https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/)
- [Kubernetes: Creating Highly Available Clusters with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/)
- [Kubernetes: PKI Certificates and Requirements](https://kubernetes.io/docs/setup/best-practices/certificates/)
