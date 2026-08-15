for (const [index, task] of tasks.entries()) {
  try {
    console.log(
      `[시뮬레이션] [${index + 1}/${tasks.length}] ${task.channelSlug} image #${task.imageIndex + 1} ${snowflakeToKST(task.messageId)}`,
    );

    lastSuccessfulTask = task;
  } catch (err) {
    console.error(
      `❌ [${index + 1}/${tasks.length}] ${task.channelSlug} image #${task.imageIndex + 1}`,
    );
    console.error(err);

    if (lastSuccessfulTask) {
      await saveState({
        time: snowflakeToKST(lastSuccessfulTask.messageId),
        messageId: lastSuccessfulTask.messageId,
        imageIndex: lastSuccessfulTask.imageIndex,
        userId: lastSuccessfulTask.userId,
        channelSlug: lastSuccessfulTask.channelSlug,
        url: lastSuccessfulTask.imageUrl,
      });

      console.log(
        `💾 State saved: ${lastSuccessfulTask.messageId} / image #${lastSuccessfulTask.imageIndex + 1} ${snowflakeToKST(task.messageId)}`,
      );
    } else {
      console.log(`💾 No successful uploads. State was not changed.`);
    }

    console.error("\n❌ Upload failed. Stopping.");
    process.exit(1);
  }

  // 테스트 시에는 대기 시간을 10ms로 줄여서 순식간에 지나가도록 설정합니다.
  await sleep(DELAY);
}

// 모든 작업 완료 후 최종 상태 저장
if (lastSuccessfulTask) {
  await saveState({
    time: snowflakeToKST(lastSuccessfulTask.messageId),
    messageId: lastSuccessfulTask.messageId,
    imageIndex: lastSuccessfulTask.imageIndex,
    userId: lastSuccessfulTask.userId,
    channelSlug: lastSuccessfulTask.channelSlug,
    url: lastSuccessfulTask.imageUrl,
  });

  console.log(
    `💾 Final State saved: ${lastSuccessfulTask.messageId} / image #${lastSuccessfulTask.imageIndex + 1}`,
  );
}

console.log(`\n🎉 Done! ${tasks.length} image(s) processed (Simulation).`);