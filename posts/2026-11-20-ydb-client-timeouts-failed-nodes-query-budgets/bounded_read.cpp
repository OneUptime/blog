// Source-reviewed for YDB C++ SDK v3.27.0; caller owns a configured client.
#include <ydb-cpp-sdk/client/query/client.h>
#include <ydb-cpp-sdk/client/retry/retry.h>

NYdb::TStatus BoundedReadProbe(NYdb::NQuery::TQueryClient& client) {
    auto retries = NYdb::NRetry::TRetryOperationSettings()
        .MaxRetries(2)
        .MaxTimeout(TDuration::Seconds(2))
        .GetSessionClientTimeout(TDuration::MilliSeconds(200))
        .Idempotent(true);
    return client.RetryQuerySync(
        [](NYdb::NQuery::TSession session) -> NYdb::TStatus {
            return session.ExecuteQuery(
                "SELECT 1 AS one;",
                NYdb::NQuery::TTxControl::NoTx(),
                NYdb::NQuery::TExecuteQuerySettings()
                    .ClientTimeout(TDuration::MilliSeconds(500)))
                .GetValueSync();
        },
        retries);
}
