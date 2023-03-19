# syntax=docker/dockerfile:1

FROM node:alpine

WORKDIR /polypong
RUN corepack enable

COPY pnpm-lock.yaml ./
RUN pnpm fetch

COPY ./ /polypong

RUN pnpm install --offline

CMD [ "pnpm", "build" ]
