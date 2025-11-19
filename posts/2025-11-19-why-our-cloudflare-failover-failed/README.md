# Why our Cloudflare failover failed?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloudflare, Reliability, Incident Management, Security

Description: On November 18, Cloudflare went down and we discovered our "turn off the proxy" failover plan depended on the very control plane that was offline. Here's what blocked us, what the postmortem taught us, and how we're redesigning our runbooks so that a CDN + DDoS Security Provider outage doesn't stall OneUptime.

Cloudflare has been our front door for years. They absorb our scrapers, smooth global latency, issue TLS certificates, and hide our IP space from opportunistic attackers. Our pragmatic failover plan was simple: if Cloudflare ever caused trouble, we would toggle their proxy off, expose the origin IPs, eat the traffic directly for a few hours, and rotate the IPs once Cloudflare came back online.

On November 18, that plan met reality. Cloudflare's network melted, the dashboard returned 500s, Turnstile never solved, the API tokens we **meant** to create didn't exist, and our "simple" failover was stuck one click away. The outage captured the same story across hundreds of teams: clever mitigations that all relied on Cloudflare being healthy enough to let you run them.

## What actually failed

- **Single control plane dependency.** Our entire runbook hinged on the Cloudflare dashboard being reachable. When it wasn't, the plan stopped at step one.
- **Missing automation artifacts.** We use Terraform (OpenTofu), but no pre-generated API token with the `Zone.DNS` scope stored in our password vault. No token means no IaC fallback.
- **Turnstile lockout.** Even when the dashboard briefly loaded, the captcha endpoint returned `Please unblock challenges.cloudflare.com`, blocking human access.

## How we're changing our runbooks

### 1. Ship an API-first failover switch

We now keep a scoped service token (Zone:Read, Zone:Edit) in Secrets Vault, plus a read-only backup in our hardware key vault. The new `failover/off-cloudflare-proxy.sh` script:

- Uses the Cloudflare API to list every `proxied=true` DNS record in the production zones.
- Writes the pre/post state to our log store for auditability.
- Flips the records to `proxied=false` in parallel and waits for success responses.

We plan to run the script quaterly in staging so that the token, dependencies, and throttling limits stay fresh in muscle memory.

### 2. Rotate origin IPs automatically after exposure

Turning the proxy off is only safe if we can rotate the attack surface afterwards. We've added the following safeguards:

- Each critical service has a spare IP from our colocation provider ready to attach. We can switch IP in seconds bynchaning our MetalLB config.
- As soon as Cloudflare recovers, the same script flips the proxy back on and then reassigns the IPs, invalidating the leaked addresses.
- The firewall refuses direct traffic from the Internet unless Cloudflare's is down, in which case we open only the minimum ports until rotation completes.

### 3. Status Pages off Cloudflare

- **Status page:** Our public status page and all of our customer status pages are never proxied. They have always lived off cloudflare for this very reason.  If Cloudflare is down, we can still talk to our customers, and they can talk to theirs. 


### 4. Test upstream chaos quarterly

We're adding a quarterly GameDay where we simulate: "Cloudflare down". The SRE on call must execute the proxy-off script, rotate IPs, and publish an update from our status page within 5 minutes of the incident start.

## Closing thought

Cloudflare going down wasn't the failure. The failure was assuming we could lean on their control plane to save us from their data plane. 