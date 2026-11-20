# Validation Summary: Self-Hosted vs. Air-Gapped Monitoring

## Review scope

Reviewed on 20 November 2026. This conceptual and migration-assessment article distinguishes hosting responsibility from network separation. Scenarios are illustrative, not reports of deployed systems.

## Documentation checks

- Checked the NIST glossary's air-gap definition, including physical separation and human-controlled transfer. The article distinguishes that definition from firewall isolation and broader product terminology.
- Checked Kubernetes image pull policies and digest behavior. Local cached images can conceal registry dependencies; pinning a digest does not supply image content offline.
- Checked Grafana Generic OAuth authorization, token, and user-information endpoints. The article separates browser access from server-side authentication dependencies.
- Checked Let's Encrypt HTTP-01 and DNS-01 validation. DNS-01 can support private web servers but still requires an external issuance workflow; no claim is made that every private site needs public inbound access.
- Checked Slack incoming-webhook delivery to a hosted endpoint and Alertmanager's configurable SMTP and webhook destinations.
- Reviewed boundary scenarios and migration recommendations for consistency. The focus is identifying and replacing dependencies, rather than repeating an architecture guide or product-selection comparison.

## Artifact checks

- README metadata follows repository format, with the existing author nawazdhandala and existing tags Air-Gapped, Monitoring, Observability.
- Title: 62 characters. Description: 153 characters.
- Word count: 1,453 including metadata, excluding link URLs.
- One H1 followed by H2 sections; no executable examples or configuration snippets requiring syntax checks.
- Generated social-media.png using the existing npm script. Confirmed 1280 x 720 dimensions and visually inspected the full image: all three title lines are legible and unclipped.
- Focused metadata, author, tag, heading, word-count, and image-dimension checks passed.

## Limitations

No live deployment, isolation, image-pull, authentication, certificate issuance or renewal, notification, or recovery tests were performed. Documentation review supports the technical explanations, not a claim of operational certification. Product documentation may change; deployment-specific behavior needs verification against the selected release and configuration.

Repository-wide validation and catalog integration are reserved for parent review. The repository validator was not run here because it can modify shared catalog files.

## Official sources checked

- https://csrc.nist.gov/glossary/term/air_gap
- https://kubernetes.io/docs/concepts/containers/images/
- https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/
- https://letsencrypt.org/docs/challenge-types/
- https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- https://prometheus.io/docs/alerting/latest/configuration/

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
