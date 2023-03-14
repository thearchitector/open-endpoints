# syntax=docker/dockerfile:1


# == V STAGE
FROM alpine:3.17 as v

ENV VFLAGS "-cc gcc -prod"
ENV CCACHE_DIR "/var/cache/ccache"

WORKDIR /opt/ccache
RUN apk --no-cache add \
        git \
        build-base \
        cmake \
        bash \
        vim \
        zstd-dev && \
    git clone \
        --depth 1 \
        --branch v4.8 \
        https://github.com/ccache/ccache.git . && \
    mkdir build && \
    cd build && \
    cmake -DCCACHE_DEV_MODE=OFF -DREDIS_STORAGE_BACKEND=OFF -DENABLE_DOCUMENTATION=OFF -DENABLE_TESTING=OFF -DCMAKE_BUILD_TYPE=Release .. && \
    make && \
    make install && \
    ln -s /usr/local/bin/ccache /usr/local/bin/gcc

RUN ccache -s

WORKDIR /opt/vlang
RUN --mount=type=cache,target=$CCACHE_DIR \
    git clone \
        --depth 1 \
        https://github.com/vlang/v.git . && \
    make && \
    ./v symlink


# == APPLICATION STAGE
FROM v

RUN apk --no-cache add \
        libpq-dev \
        postgresql-client \
        curl \
        jq

WORKDIR /openendpoint-tools
COPY ./ /openendpoint-tools

RUN --mount=type=cache,target=$CCACHE_DIR \
    v -output server .

CMD [ "./server" ]
