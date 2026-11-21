#pragma once
#include <exception>

// Work must finish and release its own clients/callbacks before returning.
template <class Driver, class Work>
int WithStoppedDriver(Driver& driver, Work&& work) {
    int exitCode = 1;
    std::exception_ptr failure;
    try {
        exitCode = work();
    } catch (...) {
        failure = std::current_exception();
    }
    driver.Stop(true);
    if (failure) {
        std::rethrow_exception(failure);
    }
    return exitCode;
}
