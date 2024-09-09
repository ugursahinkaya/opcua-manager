<script lang="ts" setup>
import { manager } from "../app";
</script>
<template>
  <div class="q-pa-md full-width">Server Manager</div>
  <div class="q-pa-md full-width">
    {{ manager.serverManager.activeManager }}
  </div>
</template>
