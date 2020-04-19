/* eslint-disable class-methods-use-this */
class MyCustomReporter {
  onRunComplete(contexts, results) {
    const { testResults } = results;
    const [result] = testResults;
    const { failureMessage } = result;
    if (failureMessage) {
      const failureMessages = failureMessage.split('\n');
      const filteredBySatisfyTag = failureMessages
        .filter((message) => message.match(/satisfy-tag/))
        .map((message) => message.replace('satisfy-tag', '').trim());

      console.log('\n');
      filteredBySatisfyTag.forEach((message) => {
        console.log(message);
      });
    }
  }
}

module.exports = MyCustomReporter;
