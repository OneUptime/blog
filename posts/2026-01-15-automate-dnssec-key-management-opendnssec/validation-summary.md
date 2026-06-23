# Validation Summary: How to Automate DNSSEC Key Management with OpenDNSSEC

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- OpenDNSSEC 2.1 (ods-enforcer, ods-signer)
- DNSSEC (KSK/ZSK key lifecycle, NSEC3, DS records)
- SoftHSM2 (PKCS#11)
- KASP (Key and Signing Policy) configuration
- BIND and NSD (signed-zone serving)
- Prometheus alerting / Bash operational scripting

## Sources Consulted
- OpenDNSSEC kasp.xml documentation (NLnet Labs): https://opendnssec.docs.nlnetlabs.nl/en/latest/configuration/kaspxml/
- OpenDNSSEC RELAX NG schema for KASP (`kasp.rnc`): https://github.com/opendnssec/opendnssec-svn/blob/master/conf/kasp.rnc
- OpenDNSSEC sample policy (`kasp.xml.in`): https://github.com/opendnssec/opendnssec-svn/blob/master/conf/kasp.xml.in
- OpenDNSSEC RELAX NG schema for conf.xml (`conf.rnc`): https://github.com/opendnssec/opendnssec-svn/blob/master/conf/conf.rnc
- Ubuntu manpage `ods-kasp(5)`: https://manpages.ubuntu.com/manpages/jammy/man5/ods-kasp.5.html

## Issues Found

1. **`<OptOut>false</OptOut>` is invalid in the KASP NSEC3 block (two occurrences).**
   In the OpenDNSSEC KASP schema, `OptOut` is defined as `element OptOut { empty }` — an
   empty, presence-based flag. The element takes no text content, and its mere presence
   *enables* opt-out. Writing `<OptOut>false</OptOut>` both fails schema validation (text in
   an empty element) and, if it parsed, would do the opposite of the author's intent (it would
   turn opt-out on). Since the policies clearly intend opt-out to be disabled, I removed the
   `<OptOut>false</OptOut>` lines from both the `default` and `lab` policies. (Opt-out is
   disabled by omitting the element.)

2. **`<ManualRollover>true</ManualRollover>` / `<ManualRollover>false</ManualRollover>` are invalid (four occurrences).**
   Like `OptOut`, `ManualRollover` is defined as `element ManualRollover { empty }` — its
   presence requires a manual rollover trigger; its absence means automatic rollover. Boolean
   text content is not valid. Fixes applied:
   - `default` policy KSK: `<ManualRollover>true</ManualRollover>` → `<ManualRollover/>` (keeps the
     intended manual-KSK behavior).
   - `default` policy ZSK, `lab` policy KSK, and `lab` policy ZSK: removed the
     `<ManualRollover>false</ManualRollover>` lines so those keys roll automatically (the intent).

3. **"Understanding Policy Parameters" table described `ManualRollover` as a boolean.**
   The recommended-value cell said `true for KSK`, reinforcing the incorrect boolean usage.
   Updated the row to describe `ManualRollover` as an empty element (`include <ManualRollover/>`
   to require a manual trigger, omit for automatic) with the recommended value "Present for KSK".

## Review Notes
- Everything else verified as correct against the schemas and docs: the `conf.xml` structure
  (`RepositoryList` → `Common` → `Enforcer` → `Signer`, `Datastore/SQLite`,
  `AutomaticKeyGenerationPeriod`, `Signer/WorkingDirectory`, `Signer/NotifyCommand`), the
  `Keys` element ordering (`TTL`, `RetireSafety`, `PublishSafety`, `KSK`, `ZSK`), `Standby`
  as a non-negative integer, `Algorithm` with a `length` attribute, the `Signatures` and
  `Zone`/`Parent` `PropagationDelay` elements, the four enforcer key states (hidden, rumoured,
  omnipresent, unretentive per RFC 7583), the algorithm IDs (8 = RSASHA256, 10 = RSASHA512,
  13 = ECDSAP256SHA256, 14 = ECDSAP384SHA384), and the CLI commands
  (`ods-enforcer-db-setup`, `ods-enforcer policy import`, `ods-enforcer zone add`,
  `ods-enforcer key list/rollover/export --ds/ds-seen`, `ods-signer sign --all`, `ods-signer queue`).
- Best-practice caveats (left as-is, not technical errors): the ZSK uses 1024-bit RSA
  (`<Algorithm length="1024">8</Algorithm>`); current guidance (RFC 8624) recommends at least
  2048-bit RSA or moving to ECDSA (algorithm 13). The NSEC3 `Iterations` values of 10 and 5
  predate RFC 9276, which recommends 0 iterations and an empty salt for new deployments.
- The `dnssec-verify example.com` entry in the best-practices table is shorthand; the BIND
  `dnssec-verify` tool normally takes `-o <origin> <zonefile>`. Left unchanged as it reads as a
  conceptual reference rather than a copy-paste command.
