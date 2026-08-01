# kOps “Cluster Not Found”: How to Recover the Correct `KOPS_STATE_STORE` and Context

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, KOPS_STATE_STORE, Kubeconfig, AWS S3, Troubleshooting

Description: Recover a missing kOps cluster safely by identifying the correct state store, cluster name, AWS identity, and kubeconfig context before making changes.

---

“Cluster not found” does not usually mean that the EC2 instances or Kubernetes API have disappeared. It means the `kops` process cannot find the named `Cluster` object in the state store it is currently reading.

That distinction matters. kOps desired state lives in a state store, commonly an S3 bucket on AWS. Kubernetes client state lives in one or more kubeconfig files. A working `kubectl` context does not prove that `kops` is looking at the right bucket, and finding the right bucket does not automatically switch `kubectl` to the right context.

Treat recovery as an identity problem across four values:

| Value | Question |
| --- | --- |
| AWS identity | Which account and role is the shell using? |
| State store | Which bucket or other VFS location is kOps reading? |
| Cluster name | Which exact cluster object should exist there? |
| Kubeconfig context | Which API endpoint and user will `kubectl` use? |

Do not create a replacement cluster just because the first lookup fails. First recover those four values with read-only commands.

## Understand State-Store Precedence

kOps documents this state-store selection order, from highest to lowest priority:

1. `--state` on the command line;
2. `KOPS_STATE_STORE` in the environment;
3. `$HOME/.kops.yaml`;
4. `$HOME/.kops/config`.

A stale `--state` therefore overrides a correct environment variable. A stale environment variable overrides the correct per-user config. Make the selected store visible before investigating anything else:

```bash
printf 'KOPS_STATE_STORE=%s\n' "${KOPS_STATE_STORE:-<unset>}"
kops version
aws sts get-caller-identity
```

`aws sts get-caller-identity` is important when the same workstation assumes roles in several accounts. Two accounts can contain similarly named state buckets, and an S3 `AccessDenied` response is not the same failure as a cluster prefix that is genuinely absent.

For diagnostics, prefer an explicit `--state` over repeatedly exporting different values into the shell:

```bash
kops get clusters --state s3://candidate-kops-state
```

The command lists cluster objects in that candidate store. It does not contact the Kubernetes API or alter cloud resources.

## Recover the Store Before the Context

Search controlled sources of truth in this order:

- infrastructure-as-code variables and outputs;
- deployment pipeline configuration;
- password-manager or secrets-manager entries for operator profiles;
- team runbooks and inventory;
- shell startup files and kOps config files;
- S3 bucket inventory in each plausible AWS account.

If IAM permits bucket listing, this is a read-only clue rather than proof:

```bash
aws s3api list-buckets \
  --query 'Buckets[?contains(Name, `kops`) || contains(Name, `state`)].Name' \
  --output table
```

Test each plausible bucket by asking kOps to enumerate it. Do not guess an object path and do not copy data yet:

```bash
kops get clusters --state s3://candidate-one
kops get clusters --state s3://candidate-two
```

A shared bucket can contain several clusters. Match the complete name, including its DNS suffix, rather than accepting a similar prefix:

```bash
kops get cluster prod.example.com \
  --state s3://confirmed-kops-state \
  -o yaml
```

This also confirms that the selected AWS identity can read the cluster configuration. Avoid pasting the YAML into tickets or chat: the state store contains security-sensitive cluster material even when a particular command output looks harmless.

## Recover the Exact Cluster Name

The name can come from an explicit command argument, `--name`, `KOPS_CLUSTER_NAME`, or command-specific context inference. Remove ambiguity while recovering:

```bash
printf 'KOPS_CLUSTER_NAME=%s\n' "${KOPS_CLUSTER_NAME:-<unset>}"
kops get clusters --state s3://confirmed-kops-state
```

Then use the exact value in every diagnostic command:

```bash
kops validate cluster prod.example.com \
  --state s3://confirmed-kops-state \
  --wait 10m
```

If the store lists `prod.example.com` but the command asks for `production.example.com`, changing kubeconfig will not fix the lookup.

## Inspect Kubeconfig Separately

Now inspect the Kubernetes client side:

```bash
kubectl config current-context
kubectl config get-contexts
kubectl config view --minify --raw=false
```

The minified view shows which cluster, server, and user the current context references without deliberately printing embedded private key data. Also check whether `KUBECONFIG` is redirecting `kubectl` away from the default file:

```bash
printf 'KUBECONFIG=%s\n' "${KUBECONFIG:-<default>}"
```

Select an existing correct context if one is already present:

```bash
kubectl config use-context prod.example.com
```

Context names can be customized, so verify the server and cluster mapping rather than trusting the label alone.

## Re-export Without Clobbering a Working File

If the correct context is missing or its short-lived admin certificate has expired, export into a separate file first:

```bash
kops export kubeconfig prod.example.com \
  --state s3://confirmed-kops-state \
  --admin=8h \
  --kubeconfig ./prod-recovered.kubeconfig

KUBECONFIG=./prod-recovered.kubeconfig kubectl get nodes
```

The current kOps CLI gives exported admin credentials an 18-hour default lifetime when `--admin` is supplied without a duration. Choose the shortest practical duration and protect the generated file as a privileged credential. For routine access, reuse the organization’s OIDC or other configured user with `--user` instead of distributing administrator certificates.

Only merge or replace the normal kubeconfig after the isolated file reaches the expected cluster.

## Make the Recovery Durable

Once all four values are confirmed, record them in a controlled inventory. A simple operator session can then be explicit:

```bash
export KOPS_STATE_STORE=s3://confirmed-kops-state
export KOPS_CLUSTER_NAME=prod.example.com

kops get cluster "${KOPS_CLUSTER_NAME}"
kops validate cluster "${KOPS_CLUSTER_NAME}" --wait 10m
```

Do not persist temporary AWS credentials in shell startup files. Prefer a named AWS profile or your organization’s identity workflow, then document which account and role own the state bucket.

## Avoid the Dangerous “Fixes”

Until the cluster is found, do not:

- run `kops create cluster` with the same name;
- run `kops update cluster --yes` against a guessed store;
- copy one candidate store over another;
- delete a state-store prefix because it looks unused;
- use `--insecure-skip-tls-verify` to hide a kubeconfig trust problem.

Those actions turn a selection error into divergent desired state or data loss.

The safe recovery proof is straightforward: the explicit store lists the exact cluster, the explicit cluster YAML is readable, the kubeconfig server is the intended endpoint, and both `kops validate cluster` and a harmless `kubectl` read operate on the same cluster.

## Official Documentation

- [kOps: The State Store](https://kops.sigs.k8s.io/state/)
- [kOps CLI: `kops get clusters`](https://kops.sigs.k8s.io/cli/kops_get_clusters/)
- [kOps CLI: `kops validate cluster`](https://kops.sigs.k8s.io/cli/kops_validate_cluster/)
- [kOps CLI: `kops export kubeconfig`](https://kops.sigs.k8s.io/cli/kops_export_kubeconfig/)
- [Kubernetes: Organizing Cluster Access Using kubeconfig Files](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/)
- [AWS CLI: `get-caller-identity`](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html)
