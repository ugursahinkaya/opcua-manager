<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title> </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <div class="row flex q-pa-sm">
        <div class="col-3 q-pa-sm">
          <q-list separator bordered>
            <q-item
              clickable
              dense
              v-for="(component, key) in components"
              :key="key"
              @click="activeComponent = markRaw(component)"
            >
              <q-item-section>
                <q-item-label>{{ key }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
        <div class="col-9">
          <component :is="activeComponent" />
        </div>
      </div>
    </q-page-container>
  </q-layout>
</template>
<script setup lang="ts">
import { ref, markRaw } from 'vue'
import { OpcuaServerManager, OpcuaClientManager, OpcuaServer } from '../../client'
const components = {
  'opcua-server-manager': OpcuaServerManager,
  'opcua-client-manager': OpcuaClientManager,
  'opcua-server': OpcuaServer
}
const activeComponent = ref()
</script>
