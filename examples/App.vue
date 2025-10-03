<template>
  <div style="padding: 24px">
    <h1>virtual-scroll</h1>
    <div style="height: calc(100dvh - 200px);">
      <VirtualList
        :items="testData"
        :item-size="100"
        :height="'100%'"
        :dynamic="true"
        key-field="id"
        @scroll="onScroll"
      >
        <template #default="{ item, index }">
          <div style="height:100%; padding:0 12px; border-bottom:1px solid #eee;">
            #{{ index }}---
            <p>{{ item.text }}</p>
          </div>
        </template>
      </VirtualList>
    </div>
  </div>
</template>

<script setup>
import { VirtualList } from '../src' 
import { onMounted, ref } from 'vue'

// const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
let testData = ref([])
onMounted(async () => {
  // await sleep(1000)
  for (let i = 0; i < 10000; i++) {
    testData.value.push({
      text: 'Lorem ipsum '.repeat(Math.floor(Math.random() * 50) + 1),
      id: i
    })
  }
})

const onScroll = (payload) => {
  console.log('onScroll', payload)
}
</script>
