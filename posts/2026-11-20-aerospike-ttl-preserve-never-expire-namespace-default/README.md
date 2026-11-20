# Aerospike TTL: Preserve, Never Expire, or Use the Namespace Default

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Aerospike, Database, Java, Troubleshooting

Description: Understand Aerospike TTL values -2, -1, and 0, choose safe update policies, and verify expiry without accidentally extending record lifetimes.

A session record expires at 11:00. At 10:30, a background worker updates its last activity field. Should the record still expire at 11:00, receive another hour, or live indefinitely? All three outcomes are possible, depending on the write policy.

Aerospike's time to live (TTL) controls record expiry. The tricky part is that a write accepts both durations and special instructions. Treating every number as a duration can quietly change your retention policy. This guide uses the Java client **10.5.0** to make that choice explicit; the application examples assume an already configured, authenticated client.

## Start with the write instruction

The Java client's `WritePolicy.expiration` accepts these values. The client defaults to `0`, so a write that does not set expiration still makes a retention decision. [Version 10.5.0 WritePolicy source](https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/policy/WritePolicy.java)

| Value | Meaning on a write | Useful intention |
|---|---|---|
| `-2` | Keep an existing record's expiry deadline | Update content without renewing its lifetime |
| `-1` | Make the record non-expiring | Retain until an explicit lifecycle action removes it |
| `0` | Apply the namespace's configured default TTL | Let the namespace retention policy decide |
| Positive seconds | Set a lifetime from this write | Renew a cache entry for a deliberate duration |

For creation, `-2` falls back to the namespace default because there is no previous deadline to preserve. A namespace with `default-ttl 0` makes records non-expiring when that default is selected. Neither zero means “delete immediately.” [Namespace retention documentation](https://aerospike.com/docs/database/manage/namespace/retention/)

“Never expire” is an expiry setting, not a backup or a guarantee against deletion. Your application can still delete the record. Give permanent records a documented owner and removal process instead of relying on a negative number as a complete data lifecycle policy.

## Think in deadlines, not original durations

Consider four separate copies of a record created at 10:00 with a one-hour TTL. Each receives an update at 10:30. Assume the namespace default is now 15 minutes, TTL reductions are allowed, and no other operation changes expiry.

| Update policy | Resulting deadline | Why |
|---|---|---|
| `-2` | 11:00 | The original deadline stays in place |
| `3600` | 11:30 | The write starts another hour |
| `0` | 10:45 | The namespace default supplies 15 minutes |
| `-1` | No TTL deadline | The write selects non-expiring retention |

These are alternative outcomes, not four sequential updates. In particular, preserving expiry does not mean “remember the original one-hour duration and apply it again.” That distinction matters for session limits, short-lived credentials, and business records with a fixed retention deadline.

On Enterprise Database 8.1 and later, also check `apply-ttl-reductions`: setting it to false prevents a write from shortening an existing TTL. The table assumes the default value, true. [Configuration reference](https://aerospike.com/docs/database/reference/config/)

A namespace configuration change also deserves an application review. A worker using `0` may begin applying a different lifetime on its next write. Record the intended policy beside the code that updates the record, rather than assuming a default is permanent business logic.

## Give a content-only update its own policy

The following helper uses the published Maven dependency `com.aerospike:aerospike-client-jdk8:10.5.0`. It updates a bin, which is Aerospike's name for a field, while preserving expiry. Use it with an existing test record and your normal client connection; it does not configure credentials or create a namespace.

```java
import com.aerospike.client.AerospikeClient;
import com.aerospike.client.Bin;
import com.aerospike.client.Key;
import com.aerospike.client.policy.RecordExistsAction;
import com.aerospike.client.policy.WritePolicy;

public final class RetentionPolicies {
    public static WritePolicy contentUpdate(WritePolicy base) {
        WritePolicy policy = new WritePolicy(base);
        policy.expiration = -2;
        policy.recordExistsAction = RecordExistsAction.UPDATE_ONLY;
        return policy;
    }

    public static void setLabel(AerospikeClient client, Key key,
                                String label, WritePolicy base) {
        client.put(contentUpdate(base), key, new Bin("label", label));
    }
}
```

The copy keeps the supplied connection-operation policy settings without mutating the shared policy. `UPDATE_ONLY` makes a missing record an error rather than creating a new record with fallback retention. This is useful when “edit an existing session” must not become “create a replacement session.” The enum's behavior is defined in the [tagged RecordExistsAction source](https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/policy/RecordExistsAction.java).

For a deliberate renewal, make a separate policy with a positive expiration and a name that describes renewal. For permanent retention, use a separate path that explicitly selects `-1`. Avoid changing a shared default policy temporarily around a call: concurrent operations could observe the temporary setting.

This helper does not implement conflict detection. If your application needs to reject concurrent changes, add its existing generation or transaction policy deliberately. Preserving expiry alone does not protect the contents from another writer.

## Measure expiry without confusing the units

A returned Java `Record.expiration` is not the original TTL in seconds. It represents the server expiry time relative to January 1, 2010; zero represents a non-expiring record. `Record.getTimeToLive()` converts that to a remaining lifetime, returning `-1` for non-expiring records. For an apparently elapsed deadline it floors the result at one second, accounting for delay or clock differences. Do not use that calculation as proof of server-side existence. [Version 10.5.0 Record source](https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/Record.java)

For a controlled test, save the returned expiration before and after a preserving update. The absolute value should remain unchanged. Remaining TTL should decrease as time passes. Comparing two remaining-TTL readings for exact equality would be the wrong assertion.

Reads can complicate this experiment. Aerospike supports read touch, which can extend retention as a record approaches expiry. In Java 10.5.0, set `Policy.readTouchTtlPercent = -1` on observation reads to prevent that read from extending expiry. Zero defers to server configuration; positive percentages select a threshold. This field's `-1` means “do not read-touch,” unlike `WritePolicy.expiration = -1`, which means “never expire.” [Tagged read-policy documentation](https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/policy/Policy.java)

Other clients may still touch or renew the same record. Use unique test keys and keep ordinary application traffic away from them while measuring.

## Check namespace prerequisites before testing

Positive expiry requires appropriate namespace supervision. NSUP, the namespace supervisor, performs expiry cleanup. Check the running configuration rather than assuming the configuration file was applied. In a test environment with Aerospike tools installed, replace the example address and namespace:

```bash
asinfo -h 10.20.0.11 -p 3000 \
  -v 'get-config:context=namespace;namespace=test' -l
```

This is a read-only request. Supply your deployment's normal authentication and TLS options where required. Review `default-ttl`, `nsup-period`, and `allow-ttl-without-nsup`. The [configuration reference](https://aerospike.com/docs/database/reference/config/) explains the TTL safeguards; disabling them with `allow-ttl-without-nsup` is not a production fix for rejected expiring writes. The command structure is documented in the [info command reference](https://aerospike.com/docs/database/reference/info/).

Use a disposable set for the acceptance test. Create separate keys for preserve, renew, default, and non-expiring behavior. Capture each write policy, returned deadline, server version, and namespace defaults. Then update once, read with touching disabled, and check the expected deadline. Also attempt the preserving helper against a missing key: it should fail rather than create one.

Repeat with the namespace default used in production, including a zero default if applicable. Keep expiry observations separate from storage reclamation or aggregate record counts, which answer different questions. A successful retention test demonstrates the intended record deadline and read behavior; it does not establish when disk blocks will be reusable.

The helper above was compiled against the pinned client and its policy settings were checked locally. These server acceptance steps still need to run against your staging cluster before you adopt the policy.
