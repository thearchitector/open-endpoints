# syntax=docker/dockerfile:1

FROM node:alpine

WORKDIR /polypong

COPY ./ /polypong

RUN corepack enable && \
    pnpm install

USER node
CMD [ "pnpm", "build" ]
