# How to Disable IPv6 on Windows via GUI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, GUI, Network Configuration, Disable IPv6

Description: Step-by-step guide to disabling IPv6 on Windows using the graphical user interface through Network Adapter Properties and Network and Sharing Center.

## Method 1: Network Adapter Properties

This is the most direct GUI method to disable IPv6 per adapter:

```text
Steps:
1. Press Win + R, type: ncpa.cpl, press Enter
   (Opens Network Connections)

2. Right-click the network adapter
   (e.g., "Ethernet", "Wi-Fi", "Local Area Connection")

3. Select Properties

4. In the "This connection uses the following items:" list,
   find "Internet Protocol Version 6 (TCP/IPv6)"

5. UNCHECK the checkbox next to it

6. Click OK

7. No restart required - IPv6 is disabled immediately on that adapter
```

## Method 2: Network and Sharing Center

```text
Steps:
1. Open "Network and Sharing Center"
   - Windows 10: Settings → Network & Internet → Status →
     Network and Sharing Center
   - Windows 11: Control Panel → Network and Internet →
     Network and Sharing Center

2. Click "Change adapter settings" in the left panel

3. Right-click the adapter → Properties

4. Uncheck "Internet Protocol Version 6 (TCP/IPv6)"

5. Click OK
```

## Method 3: Windows Settings (Modern UI)

On Windows 10/11 with the new Settings app:

```text
Steps:
1. Start → Settings → Network & Internet

2. Open your connection type (Ethernet or Wi-Fi) and then
   open the connected network's properties

3. Windows Settings lets you edit IPv4/IPv6 addressing,
   DNS, and network profile settings here

4. Windows Settings does NOT provide a general on/off toggle
   for the IPv6 protocol binding on the adapter

5. To disable IPv6 on the adapter, use the classic
   ncpa.cpl / Control Panel method above
```

## Verifying IPv6 is Disabled via GUI

```text
Steps:
1. Open Command Prompt (Win + R → cmd)

2. Run:
   ipconfig /all

3. Look at the disabled adapter's output
   - You should NOT see "IPv6 Address" entries
   - Other adapters may still show IPv6 addresses,
     including loopback or tunnel interfaces

4. To test IPv6 connectivity:
   ping -6 google.com
   - If another interface still has IPv6 connectivity,
     this can still succeed
   - If the disabled adapter was your only active path,
     the command should fail, but the exact error text varies
```

## What GUI Disable Does vs Registry Disable

| Method | Effect | Restart Needed? |
|--------|--------|-----------------|
| Uncheck adapter binding | Unbinds IPv6 from that adapter only | No |
| Registry DisabledComponents=0xFF | Disables IPv6 on tunnel and nontunnel interfaces, except loopback/internal use | Yes |
| Both methods combined | Broader disable, but IPv6 loopback/internal use still remains | Yes (registry) |

## Re-enabling IPv6 via GUI

```text
Steps:
1. Open ncpa.cpl (Win + R → ncpa.cpl)

2. Right-click adapter → Properties

3. CHECK "Internet Protocol Version 6 (TCP/IPv6)"

4. Click OK

IPv6 is re-enabled immediately. No restart required.
```

## Important Considerations

```text
Microsoft notes:
- Disabling or unbinding IPv6 is NOT recommended because
  Windows is tested with IPv6 enabled, and some components
  and products expect it to remain functional

- Even with registry-based disable, the loopback address (::1)
  and some internal IPv6 communication remain available

- For enterprise environments, Group Policy can be used to
  manage IPv6 transition technologies such as 6to4, ISATAP,
  and Teredo across multiple machines

- If troubleshooting IPv6 issues, consider using
  Prefer IPv4 over IPv6 in prefix policies rather than
  disabling IPv6 entirely
```

## Summary

Disable IPv6 on Windows via GUI by opening **Network Connections** (`ncpa.cpl`), right-clicking the adapter, selecting Properties, and unchecking **Internet Protocol Version 6 (TCP/IPv6)**. This takes effect immediately without a restart and is per-adapter. For broader system-wide interface disable, use the registry method (`DisabledComponents=0xFF`), but note that IPv6 loopback/internal use still remains. Re-enable by checking the checkbox again.
