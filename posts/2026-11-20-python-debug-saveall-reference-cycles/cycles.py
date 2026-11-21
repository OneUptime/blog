import gc
import platform


def make_cycles(count):
    for _ in range(count):
        ring = []
        ring.append(ring)


def main():
    if gc.garbage or gc.get_debug():
        raise RuntimeError("Run in a fresh interpreter without GC debug flags")
    was_enabled = gc.isenabled()
    gc.disable()
    try:
        gc.collect()
        make_cycles(20)
        ordinary = gc.collect()
        assert not gc.garbage
        print("ordinary:", ordinary, "saved:", len(gc.garbage))

        gc.set_debug(gc.DEBUG_SAVEALL)
        make_cycles(20)
        saved = gc.collect()
        # Store only scalar evidence, never a second list of these objects.
        self_cycles = sum(
            type(obj) is list and len(obj) == 1 and obj[0] is obj
            for obj in gc.garbage
        )
        assert self_cycles == 20
        print("saveall:", saved, "self-cycles:", self_cycles)

        gc.set_debug(0)
        gc.garbage.clear()
        recovered = gc.collect()
        assert not gc.garbage
        print("cleanup:", recovered, "saved:", len(gc.garbage))
    finally:
        gc.set_debug(0)
        gc.garbage.clear()
        gc.collect()
        if was_enabled:
            gc.enable()


if __name__ == "__main__":
    print(platform.python_implementation(), platform.python_version())
    main()
