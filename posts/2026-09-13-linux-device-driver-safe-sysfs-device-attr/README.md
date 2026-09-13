# Add a Safe Read/Write sysfs Attribute with DEVICE_ATTR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Kernel, C, C Programming

Description: Implement a small driver attribute with strict parsing, synchronized state, sysfs_emit, and managed lifetime cleanup.

A writable sysfs attribute becomes a userspace interface to your driver. Its design includes more than the filename: accepted values, units, error behavior, concurrency, and lifetime all become part of the contract applications rely on.

For a simple scalar control, define one text value, parse before changing state, and publish the attribute only after its backing state is ready. The following example illustrates those principles with a software-only enable flag.

## Start with a deliberately small contract

Suppose the attribute is named `enabled`. Reading returns `0` or `1` followed by a newline. Writing a boolean representation accepted by `kstrtobool()` changes a cached flag. The value is per device and starts disabled on each probe.

This is an educational integration fragment, not a complete module or hardware driver. A real device needs a documented meaning for enabled, including when hardware becomes usable and how programming failures are reported. Reuse an established subsystem ABI when it already models the control instead of creating another filename for the same function.

## Implement the callbacks

The state and handlers can look like this:

```c
#include <linux/device.h>
#include <linux/kstrtox.h>
#include <linux/mutex.h>
#include <linux/slab.h>
#include <linux/sysfs.h>

struct example_state {
    struct mutex lock;
    bool enabled;
};

static ssize_t enabled_show(struct device *dev,
                            struct device_attribute *attr, char *buf)
{
    struct example_state *state = dev_get_drvdata(dev);
    bool enabled;

    mutex_lock(&state->lock);
    enabled = state->enabled;
    mutex_unlock(&state->lock);
    return sysfs_emit(buf, "%u\n", (unsigned int)enabled);
}

static ssize_t enabled_store(struct device *dev,
                             struct device_attribute *attr,
                             const char *buf, size_t count)
{
    struct example_state *state = dev_get_drvdata(dev);
    bool enabled;
    int ret;

    ret = kstrtobool(buf, &enabled);
    if (ret)
        return ret;

    mutex_lock(&state->lock);
    state->enabled = enabled;
    mutex_unlock(&state->lock);
    return count;
}

static DEVICE_ATTR_RW(enabled);

static struct attribute *example_attrs[] = {
    &dev_attr_enabled.attr,
    NULL,
};

static const struct attribute_group example_group = {
    .attrs = example_attrs,
};
```

`DEVICE_ATTR_RW(enabled)` connects the two handlers and supplies the usual read/write attribute declaration. Use a read-only declaration when userspace should only observe state. The macro is a convenience for registration metadata; it does not synchronize access or perform validation. [Linux device attribute definitions](https://github.com/torvalds/linux/blob/master/include/linux/device.h)

The parser's accepted boolean spellings are defined by the kernel helper. If the ABI must accept exactly `0` and `1`, implement that narrower grammar explicitly rather than assuming `kstrtobool()` does so. For numeric controls, use the appropriate `kstrto*()` helper and then check the hardware range. [Kernel string conversion helpers](https://github.com/torvalds/linux/blob/master/lib/kstrtox.c)

## Initialize before publishing

Call this fragment from the appropriate probe path after deciding that this device instance should expose the attribute:

```c
static int example_add_controls(struct device *dev)
{
    struct example_state *state;

    state = devm_kzalloc(dev, sizeof(*state), GFP_KERNEL);
    if (!state)
        return -ENOMEM;

    mutex_init(&state->lock);
    state->enabled = false;
    dev_set_drvdata(dev, state);

    return devm_device_add_group(dev, &example_group);
}
```

In an existing driver, add these fields to its existing private state instead of overwriting another subsystem's driver-data pointer. The helper must be called once for the device instance. Check and propagate the returned error so a failed registration cannot silently become a successful probe.

Managed resources are released in reverse acquisition order. Registering the attribute after allocating its state lets its managed cleanup occur before that allocation is released. This does not replace an explicit teardown plan for hardware, workqueues, interrupts, or resources freed manually in a remove callback. [Kernel managed resources documentation](https://docs.kernel.org/driver-api/driver-model/devres.html)

## Make concurrency match the device

sysfs does not serialize all writers across all open files on behalf of your state machine. The mutex in the example protects the shared flag. The same lock discipline must cover any other path that accesses it, including workqueue code.

For a real hardware update, validate the requested transition, acquire the appropriate lock and runtime power reference, perform the operation, and update cached state only according to the operation's actual result. If hardware programming fails, return the error rather than claiming that `count` bytes were accepted successfully.

Do not hold a mutex in an interrupt handler. If interrupts update related state, choose a synchronization design compatible with both contexts, and move operations that may sleep into an appropriate process context.

## Validate the ABI and lifetime

On a dedicated test device, check initial readback, accepted values, invalid input, concurrent writers, and repeated probe/remove cycles. Test failure paths after state allocation and after attribute publication. The callbacks must never observe uninitialized or already-freed state.

A successful write returns the original input count, including an accepted trailing newline. `show()` returns the number of bytes actually formatted. Document the new interface under `Documentation/ABI`, including units, allowed values, and lifecycle semantics, so future changes preserve userspace behavior. [Kernel sysfs interface guidance](https://docs.kernel.org/filesystems/sysfs.html)

## Conclusion

A safe device attribute combines a small documented contract, strict conversion, synchronized state, and deliberate registration lifetime. `DEVICE_ATTR_RW` handles declaration syntax; the driver still owns correctness. Publish only initialized state and verify failure and removal paths as carefully as the successful write.

## Official Documentation

- [Linux kernel: device attribute macros](https://github.com/torvalds/linux/blob/master/include/linux/device.h)
- [Linux kernel: string conversion helpers](https://github.com/torvalds/linux/blob/master/lib/kstrtox.c)
- [Linux kernel: managed device resources](https://docs.kernel.org/driver-api/driver-model/devres.html)
- [Linux kernel: sysfs interface requirements](https://docs.kernel.org/filesystems/sysfs.html)
