# Why Azure VM Start or Redeploy Operations Hang

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, VM Extension, Guest Agent, Troubleshooting

Description: Explain why Azure Start or Redeploy can remain in progress while the guest is online, and resolve failed extensions that delay control-plane completion.

---

An Azure VM can be reachable and serving traffic while its Start or Redeploy operation still shows `In progress`. Guest availability and control-plane operation completion are different signals.

A particularly common cause is a VM extension already in `Provisioning failed`. A later Start or Redeploy operation re-engages extension provisioning, and Azure waits for the failed handler to succeed or reach its timeout. Microsoft documents extension provisioning as part of the overall operation workflow, with a 90-minute timeout in this scenario.

## Confirm the guest and platform states separately

Query instance view:

```bash
az vm get-instance-view \
  --resource-group myResourceGroup \
  --name myVM \
  --query "instanceView.statuses[].{code:code,status:displayStatus,time:time}" \
  --output table
```

The result can show `PowerState/running` while the provisioning state remains updating or while the Activity log operation is still active.

Test the actual workload independently:

- application health endpoint;
- expected port from an approved source;
- recent logs and telemetry;
- OS uptime;
- successful SSH or RDP when appropriate.

Do not tell users the operation is harmless merely because the guest responds. A pending extension may control monitoring, security, backup, access, or configuration.

## Check the Activity log

Open the VM's **Activity log**, select the Start or Redeploy event, and record:

- operation and status;
- submitted and last-updated time;
- correlation ID;
- caller;
- error details, if present.

From Azure CLI:

```bash
VM_ID=$(az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query id \
  --output tsv)

az monitor activity-log list \
  --resource-id "$VM_ID" \
  --offset 4h \
  --query "[].{time:eventTimestamp,operation:operationName.localizedValue,status:status.localizedValue,correlationId:correlationId}" \
  --output table
```

Avoid launching another Start, Stop, Resize, or Redeploy while a long-running operation owns the resource unless Microsoft guidance or Support specifically directs it. Conflicting changes can obscure the original failure.

## Inspect every extension

```bash
az vm extension list \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --query "[].{name:name,publisher:publisher,type:virtualMachineExtensionType,state:provisioningState}" \
  --output table
```

For any result other than `Succeeded`, get instance view:

```bash
az vm extension show \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --name myExtension \
  --instance-view \
  --output json
```

Also check the VM's Agent status. If the agent is Not Ready, every handler can appear stale because status cannot be reported.

## Read the guest logs

Windows:

```text
C:\WindowsAzure\Logs\WaAppAgent.log
C:\WindowsAzure\Logs\Plugins\<Publisher>.<Type>\
C:\Packages\Plugins\<Publisher>.<Type>\
```

Linux:

```text
/var/log/waagent.log
/var/log/azure/<Publisher>.<Type>/
/var/lib/waagent/<Publisher>.<Type>-<Version>/
```

Use the guest connection that still works. Preserve logs before retrying. Look for:

- package-manager or MSI locks;
- unreachable download endpoint;
- TLS or proxy failure;
- full filesystem;
- script timeout or nonzero exit;
- unsupported OS or handler version;
- pending reboot;
- disabled agent service;
- bad public or protected settings.

The first handler failure is more useful than the outer Start operation's eventual timeout.

## Repair the extension, not the symptom

The correct action depends on the extension:

- fix its network or dependency;
- correct settings and update the existing resource;
- use the publisher's documented force-update mechanism;
- remove and reinstall only when the publisher supports that recovery;
- remove a truly obsolete extension only after understanding uninstall effects.

After remediation, verify that the extension reports `Provisioning succeeded` and that its function works.

Do not delete a backup, disk-encryption, identity, monitoring, or security extension simply to make the Start operation turn green. Capture its state and follow product-specific guidance.

## Reapply and redeploy have different purposes

**Reapply** asks Azure to reapply the VM resource model and issue a new goal state:

```bash
az vm reapply \
  --resource-group myResourceGroup \
  --name myVM
```

It can clear a failed VM provisioning state or a missed model update. It usually does not reboot, but Microsoft warns it can activate a pending update that requires a restart.

**Redeploy** shuts down the VM, moves it to another Azure host, and powers it back on:

```bash
az vm redeploy \
  --resource-group myResourceGroup \
  --name myVM
```

Redeploy is disruptive. Data on the temporary disk is lost, and dynamic IP addresses can change. It can fix a host issue, but if a guest extension is broken, the new host can trigger the same failed handler again.

If the current Redeploy is the operation that is waiting, do not submit another Redeploy as a blind retry.

## Consider other causes

Failed extensions are not the only reason operations take time. Also check:

- regional or zonal allocation delays and failures;
- a partially allocated availability set;
- network-resource update failures;
- platform maintenance;
- a guest stuck booting even though one old health signal remains green;
- an unrelated Azure service incident.

Allocation failures usually surface an error code in the Activity log. A VM in `Failed` provisioning state can often be re-applied before a disruptive redeploy.

## Know when to escalate

Open Azure Support when:

- the operation exceeds the documented timeout or remains nonterminal without useful progress;
- Activity log and extension status disagree persistently;
- agent and handler logs show no request;
- the resource rejects all safe corrective operations;
- multiple VMs in a region show the same platform behavior.

Provide the subscription ID, resource ID, UTC window, correlation ID, extension inventory, agent status, and relevant logs. Do not include protected settings or secrets.

## Prevention

- Alert on failed extension provisioning before the next lifecycle operation.
- Keep scripts idempotent, noninteractive, and bounded.
- Monitor VM Agent readiness.
- Test extension changes in a representative image.
- Remove obsolete handlers through controlled change management.
- Do not make workload health depend solely on the VM resource's provisioning state.

The guest being online explains why the application works. The extension workflow explains why Azure has not yet declared the management operation complete.

## Official Documentation

- [Slow Azure VM Start operations caused by failed extensions](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/slow-vm-start-extensions-troubleshooting)
- [Troubleshoot Azure Windows VM extension failures](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/troubleshoot)
- [Virtual machine stuck in a failed state](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/vm-stuck-in-failed-state)
- [Redeploy a Windows VM to a new Azure node](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/redeploy-to-new-node-windows)
