"""Python 3.14 / YDB SDK3.35.0. Default mode checks processes only."""
import argparse
import json
import multiprocessing
import os
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path


def run_worker(connect):
    result = {"pid": os.getpid(), "method": multiprocessing.get_start_method()}
    if not connect:
        result["database_contacted"] = False
        return result

    # Import and construct SDK resources only inside the spawned worker.
    import ydb

    endpoint = os.environ["YDB_ENDPOINT"]
    database = os.environ["YDB_DATABASE"]
    if not endpoint.startswith("grpcs://") or not database.startswith("/"):
        raise ValueError("Supply a grpcs:// endpoint and absolute database path")
    token = Path(os.environ["YDB_TOKEN_FILE"]).read_text().strip()
    roots = Path(os.environ["YDB_CA_FILE"]).read_bytes()
    if not token or not roots:
        raise ValueError("Token and CA files must be nonempty")
    with ydb.Driver(
        endpoint=endpoint,
        database=database,
        credentials=ydb.AccessTokenCredentials(token),
        root_certificates=roots,
    ) as driver:
        driver.wait(timeout=5, fail_fast=True)
        with ydb.QuerySessionPool(driver, size=2) as pool:
            sets = pool.execute_with_retries(
                "SELECT 1 AS one;",
                retry_settings=ydb.RetrySettings(
                    max_retries=1, max_session_acquire_timeout=1, idempotent=True
                ),
                settings=ydb.BaseRequestSettings().with_timeout(3),
            )
            assert len(sets) == 1 and sets[0].rows[0].one == 1
    result["database_contacted"] = True
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--connect", action="store_true",
                        help="Run SELECT 1 using worker-local SDK resources")
    args = parser.parse_args()
    context = multiprocessing.get_context("spawn")
    with ProcessPoolExecutor(max_workers=2, mp_context=context) as workers:
        results = list(workers.map(run_worker, [args.connect] * 2))
    for result in results:
        assert result["pid"] != os.getpid() and result["method"] == "spawn"
    print(json.dumps({"parent_pid": os.getpid(), "results": results}, indent=2))


if __name__ == "__main__":
    main()
