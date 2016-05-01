var config = {
  // Master that runs beanstalkd
  'MasterIP': '193.230.152.1',
  'MasterPort': 4430,
  'mongo': 'mongodb://localhost:27017/5secunde',
  // # of instances to spin up for each CPU core on the machine
  'ProcMult': 2,

  // # of instances to cap out on this machine
  'MaxProc': 10
};

module.exports = config;
