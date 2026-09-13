# Fix sysfs_create_group Duplicate Names After Module Reload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Kernel, C, Troubleshooting

Description: Trace duplicate sysfs registration to object ownership, failed probe cleanup, and mismatched group lifetimes.

A kernel warning about a duplicate sysfs filename usually means code tried to register a name that already exists under the same parent. It does not mean sysfs successfully created two identical directory entries. A module reload or device rebind can expose the bug, but the cause is commonly an ownership or cleanup mistake.

The fix is to identify which code owns the attribute group and pair its publication with the lifetime of the correct object.

## Capture the parent and the first failure

Preserve the complete warning, returned error, and call trace from the first failed registration. The parent path matters as much as the filename. Two devices may each legitimately expose `enabled`; two registrations of `enabled` on one device collide.

Record the device name, group name, and whether the parent is a per-device kobject or a global object created by module initialization. Also check whether two entries in one attribute array have the same exported name.

The group API explicitly reports an error when requested attribute files already exist. Ignoring that return value makes later behavior harder to interpret because probe may continue with an incomplete or unexpected interface. [Linux sysfs group implementation](https://github.com/torvalds/linux/blob/master/fs/sysfs/group.c)

## Look for two owners

Search all registration paths in the driver and its framework:

```bash
rg -n 'sysfs_create_group|device_add_group|devm_device_add_group' drivers/example
rg -n 'dev_groups|groups|default_groups|example_attrs' drivers/example
```

Common collisions include manually creating a group that the driver core already installs through a group field, calling a helper twice from probe, and registering a global control once for every physical device.

A static `struct attribute_group` is not inherently wrong. The same descriptor can be used for separate device kobjects. The collision occurs when registrations target the same parent and exported name. Moving the descriptor into a dynamically allocated structure does not fix that ownership error.

## Pair explicit creation with explicit removal

This simplified control flow shows the ownership boundary for an unmanaged group:

```c
ret = sysfs_create_group(&dev->kobj, &example_group);
if (ret)
    return ret;

ret = example_finish_probe(dev);
if (ret) {
    sysfs_remove_group(&dev->kobj, &example_group);
    return ret;
}

return 0;
```

The function `example_finish_probe()` is an illustrative placeholder for later work. The corresponding successful-device removal path must remove that same group from that same kobject before freeing the state used by callbacks.

Failure after successful creation is different from failure returned by `sysfs_create_group()` itself. Do not blindly remove a group after a failed creation attempt and risk interfering with a different owner. First correct the duplicate registration. The kernel's group helpers perform their own internal error handling; callers remain responsible for resources successfully acquired earlier in their own probe sequence.

If probe returns `-EPROBE_DEFER` after publishing a group, the next probe attempt must see a clean state. Treat deferred probe as a normal unwind path, not an exception to cleanup.

## Prefer one consistent managed lifetime

For a group tied to a device binding, managed registration can simplify cleanup:

```c
ret = devm_device_add_group(dev, &example_group);
if (ret)
    return ret;
```

This is a registration fragment, not a complete driver. Allocate and initialize all callback state first, and let the device's managed-resource lifecycle release the group. Do not also leave an unconditional `sysfs_remove_group()` for the same managed registration in another path. If early removal is required, use the matching managed removal interface deliberately. [Device infrastructure APIs](https://docs.kernel.org/driver-api/infrastructure.html)

Managed cleanup occurs according to resource lifetime and acquisition order. It is not a guarantee that your manually freed hardware state remains valid until the group disappears. A remove callback that frees callback state before managed cleanup runs can still create a race. [Kernel devres documentation](https://docs.kernel.org/driver-api/driver-model/devres.html)

Choose one model, document it beside the registration, and audit every early return against it.

## Audit global kobjects separately

A global directory created during module initialization has a different lifetime from each probed device. Its kobject reference and release path must be balanced during module exit and initialization failures. A leaked global object can keep its name present even after the driver instance that created it is gone.

Do not reuse a kobject after its final release or allocate a new object with the same name while the old one still exists. Reference counting determines when object memory can be released; deleting directory entries and freeing the enclosing allocation are distinct steps. [Kernel kobject lifetime documentation](https://docs.kernel.org/core-api/kobject.html)

## Verify the sequence that originally failed

Test first probe, successful removal, a second probe, and a forced failure after group creation. For multi-device drivers, test two devices simultaneously to expose accidental global registration. Run these checks on a development kernel with suitable diagnostics and confirm that callbacks cannot execute after their state is released.

Do not fix the warning by appending an incrementing suffix to the filename. That would change the userspace ABI and leave the original lifetime problem intact. Likewise, replacing creation with an update call is appropriate only when updating visibility or permissions of an existing owned group is actually the intended operation.

## Conclusion

Duplicate-name warnings are evidence of conflicting registration or an object that outlived its intended owner. Find the exact parent, assign one owner to each group, and unwind every successful publication before its backing state disappears. Repeated probe and failure-path testing confirms the fix more effectively than renaming the attribute.

## Official Documentation

- [Linux kernel: sysfs group implementation](https://github.com/torvalds/linux/blob/master/fs/sysfs/group.c)
- [Linux kernel: device infrastructure](https://docs.kernel.org/driver-api/infrastructure.html)
- [Linux kernel: managed resources](https://docs.kernel.org/driver-api/driver-model/devres.html)
- [Linux kernel: kobject lifetimes](https://docs.kernel.org/core-api/kobject.html)
