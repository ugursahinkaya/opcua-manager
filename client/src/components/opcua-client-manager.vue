<script lang="ts" setup>
import { onMounted } from "vue";
import { manager } from "../app";
onMounted(async () => {
  console.log(111);
  await manager.clientManager.get();

  console.log(222, manager.clientManager);
});
</script>
<template>
  <div class="q-pa-md full-width">Client Manager</div>
  <div class="q-pa-md full-width">
    {{ manager.clientManager.list }}
    {{ manager.clientManager.activeManager }}
  </div>
</template>
