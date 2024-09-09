<script lang="ts" setup>
import { manager } from "../app";
</script>
<template>
  <div class="q-pa-md full-width">Server</div>
  <div class="q-pa-md full-width">
    {{ manager.server.activeServer }}
  </div>
</template>
