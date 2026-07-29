# Why Does a Vulnerability Scanner Still Report CVEs in a Chainguard-Based Image?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Vulnerability Scanning, Container Security, CVE, SBOM

Description: Triage CVEs in Chainguard-based images by separating real findings, stale digests, added application layers, and scanner matching errors.

---

Low-to-no CVE does not mean a scanner is contractually required to return zero forever. Vulnerability data changes after an image is built, scanners use different databases and matching rules, and a Chainguard-based application image contains software that Chainguard did not add.

Treat every finding as a claim about a specific package in a specific digest. Verify that claim before suppressing it or changing the image.

## Freeze the evidence

Record:

- full image digest;
- platform;
- scanner name and version;
- vulnerability database build time;
- scan time;
- package name, version, type, path, and package URL;
- CVE or advisory identifier;
- reported fixed version.

```bash
docker pull registry.example.com/app:production
docker image inspect registry.example.com/app:production \
  --format '{{index .RepoDigests 0}}'

grype version
grype registry.example.com/app@sha256:REPLACE_WITH_DIGEST -o json \
  > grype-result.json
```

Scanning the same digest next week can produce a different result because new advisories were published or existing records were corrected. Chainguard's CVE visualizations explicitly note that historical results reflect the database available on the scan date.

## Determine who added the package

A final application image commonly contains:

1. Chainguard operating-system packages;
2. language dependencies from PyPI, npm, Maven, or another ecosystem;
3. application binaries;
4. packages added by a downstream Dockerfile;
5. copied files that a scanner identifies heuristically.

Compare the finding to the Chainguard base SBOM and the final-image SBOM. Chainguard's shared-responsibility model does not make it responsible for CVEs in software a downstream team adds.

For a multi-stage build, ensure the final stage did not accidentally copy an entire builder filesystem, package cache, test fixture, or source archive. Scanners can correctly identify vulnerable components that are present even if the application never intended to ship them.

## Check whether the image is current

Tags move, digests do not. A workload pinned to an older digest does not receive later Chainguard rebuilds:

```bash
docker buildx imagetools inspect cgr.dev/chainguard/python:latest
kubectl get deployment api \
  -o jsonpath='{.spec.template.spec.containers[*].image}'
```

If a fix exists in a newer digest, update through the normal test and promotion process. Do not change a running manifest to an unreviewed floating tag as an emergency substitute.

Older version streams, end-of-life software, and packages awaiting upstream fixes can carry real vulnerabilities. Chainguard's current FAQ also calls out persistent findings in some large Java applications, including shaded JAR dependencies and fixes that would require breaking major upgrades.

## Compare the scanner's package identity

False positives often begin with an imprecise match:

- a generic CPE is mapped to a distro package with the same upstream name;
- a scanner treats a backported fix as vulnerable because the upstream version string looks old;
- a file is identified twice as an APK and a language package;
- a source archive or test fixture is mistaken for an installed component;
- the scanner lacks current Wolfi advisory data;
- architecture or package namespace is wrong.

Find the component in the SBOM:

```bash
jq -r '
  .packages[]
  | select(.name == "AFFECTED_PACKAGE")
  | {
      name,
      versionInfo,
      externalRefs
    }
' final-image.spdx.json
```

Package URLs encode ecosystem and namespace information that makes a stronger match than a name alone.

## Consult Chainguard advisories

Chainguard uses Grype as its primary detection tool and publishes advisory states including:

- under investigation;
- affected;
- not affected;
- pending upstream fix;
- fixed;
- fix not planned.

Look up both the package and CVE. A `not affected` determination is evidence for a false-positive exception. `Pending upstream fix` is a real risk state, not a scanner bug. `Fixed` should identify a package version or build to which the image can move.

Scanner data and Chainguard advisory data can update at different times. Preserve the advisory URL and timestamp used for a decision.

## Rescan with a current, Wolfi-aware tool

Update the scanner and its database, then compare at least one second scanner if organizational policy requires corroboration:

```bash
grype db update
grype cgr.dev/chainguard/python@sha256:REPLACE_WITH_DIGEST

trivy image \
  cgr.dev/chainguard/python@sha256:REPLACE_WITH_DIGEST
```

Different totals do not determine which scanner is correct. Compare the exact package match, advisory source, fixed version, and VEX handling.

Development and full variants contain more packages than standard distroless variants, so they can legitimately have a different attack surface and finding count.

## Use VEX as a signed decision record

A Vulnerability Exploitability eXchange statement can communicate that a finding is not affected, fixed, or otherwise assessed. It should reference the precise product and vulnerability and include the rationale.

Do not create a blanket ignore because the base vendor is Chainguard. Require:

1. a reproducible finding;
2. component identity confirmed against the SBOM;
3. upstream and Chainguard advisory review;
4. reachability or configuration evidence where relevant;
5. an owner and expiry date;
6. a signed or otherwise controlled VEX/exception record.

Continue scanning suppressed findings. A package update or new evidence can invalidate the assessment.

## A practical outcome table

| Finding | Action |
| --- | --- |
| Old Chainguard digest, fix in current digest | Test and promote the new digest |
| Package added downstream | Update, remove, or patch it in the application build |
| Chainguard advisory says affected | Follow the available fix or documented remediation state |
| Advisory says not affected | Record evidence and apply a scoped VEX/exception |
| No upstream fix | Reduce exposure, monitor, and plan an upgrade or replacement |
| Scanner cannot identify Wolfi package correctly | Update scanner/database and report the matching defect |
| Finding only in another architecture | Scan and manage each deployed platform separately |

The goal is not to force the report to zero. It is to make every remaining result accurate, owned, and actionable.

## Official Documentation

- [How Chainguard issues security advisories](https://edu.chainguard.dev/chainguard/chainguard-images/staying-secure/security-advisories/how-chainguard-issues/)
- [How to use Chainguard security advisories](https://edu.chainguard.dev/chainguard/chainguard-images/staying-secure/security-advisories/how-to-use/)
- [False positives and false negatives in container scanners](https://edu.chainguard.dev/chainguard/chainguard-images/staying-secure/working-with-scanners/false-results/)
- [Chainguard shared responsibility model](https://edu.chainguard.dev/chainguard/chainguard-images/about/shared-responsibility-model/)
