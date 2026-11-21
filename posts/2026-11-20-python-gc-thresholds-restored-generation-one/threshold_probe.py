import argparse
import gc
import json
import platform
import sysconfig
import time

parser = argparse.ArgumentParser()
parser.add_argument('--threshold0', type=int)
args = parser.parse_args()
if args.threshold0 is not None and args.threshold0 <= 0:
    parser.error('threshold0 must be positive')
if not gc.isenabled() or gc.get_debug():
    raise RuntimeError('Use a fresh process with normal GC enabled')
original = gc.get_threshold()
chosen = (args.threshold0 or original[0], original[1], original[2])
counts = [0, 0, 0]
elapsed = [0.0, 0.0, 0.0]
starts = [0.0, 0.0, 0.0]


def observe(phase, info):
    generation = info['generation']
    if phase == 'start':
        starts[generation] = time.perf_counter()
    else:
        counts[generation] += 1
        elapsed[generation] += time.perf_counter() - starts[generation]


try:
    gc.collect()
    gc.set_threshold(*chosen)
    gc.callbacks.append(observe)
    began = time.perf_counter()
    survivors = [None] * 1000
    for index in range(100_000):
        cycle = [None]
        cycle[0] = cycle
        survivors[index % len(survivors)] = cycle
    del cycle, survivors
    duration = time.perf_counter() - began
    gc.callbacks.remove(observe)
    cleanup_count = gc.collect()
    print(json.dumps({
        'version': platform.python_version(),
        'free_threaded_build': bool(sysconfig.get_config_var('Py_GIL_DISABLED')),
        'original': original, 'thresholds': chosen,
        'workload_seconds': duration, 'collections': counts,
        'gc_seconds': elapsed, 'cleanup_objects': cleanup_count,
    }))
finally:
    if observe in gc.callbacks:
        gc.callbacks.remove(observe)
    gc.set_threshold(*original)
