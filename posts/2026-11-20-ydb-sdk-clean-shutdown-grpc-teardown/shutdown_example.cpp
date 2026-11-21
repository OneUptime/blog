// Integration fragment for YDB C++ SDK v3.27.0; caller supplies secure config.
#include "with_stopped_driver.h"
#include <ydb-cpp-sdk/client/driver/driver.h>
#include <ydb-cpp-sdk/client/query/client.h>

int RunProbe(const NYdb::TDriverConfig& config) {
    NYdb::TDriver driver(config);
    return WithStoppedDriver(driver, [&driver] {
        NYdb::NQuery::TQueryClient client(driver);
        auto result = client.ExecuteQuery(
            "SELECT 1 AS one;",
            NYdb::NQuery::TTxControl::NoTx(),
            NYdb::NQuery::TExecuteQuerySettings()
                .ClientTimeout(TDuration::Seconds(5)))
            .GetValueSync();
        return result.IsSuccess() ? 0 : 2;
    });
}
