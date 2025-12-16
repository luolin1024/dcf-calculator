const { createApp, ref, onMounted, nextTick } = Vue;

createApp({
    setup() {
        // 响应式数据
        const showFormulaHelp = ref(false);
        const initialCashFlow = ref(1000.50);
        const growthRate = ref(10);
        const discountRate = ref(12);
        const years = ref(5);
        const terminalGrowth = ref(3);
        const shareCapital = ref(10000.50); // 默认总股本10000.50万股
        const growthMode = ref('multi'); // 'single' 或 'multi'
        
        // 多阶段增长配置
        const growthStages = ref([
            { name: '高速增长期', years: 3, growthRate: 15 },
            { name: '稳定增长期', years: 2, growthRate: 8 }
        ]);

        const results = ref({
            calculated: false,
            companyValue: 0,
            operatingValue: 0,  // 这就是经营价值（预测期现金流现值）
            terminalValue: 0,
            stockPrice: 0, // 新增每股合理价格
            yearlyData: []
        });

        const chartCanvas = ref(null);
        let chartInstance = null;

        // 格式化货币显示
        const formatCurrency = (value) => {
            return new Intl.NumberFormat('zh-CN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(value);
        };

        // 添加阶段
        const addStage = () => {
            growthStages.value.push({ 
                name: `阶段${growthStages.value.length + 1}`, 
                years: 2, 
                growthRate: 5 
            });
        };

        // 删除阶段
        const removeStage = (index) => {
            if (growthStages.value.length > 1) {
                growthStages.value.splice(index, 1);
            }
        };

        // 计算DCF
        const calculateDCF = () => {
            const cashFlows = [];
            let cumulativePV = 0;
            const yearlyData = [];

            if (growthMode.value === 'single') {
                // 单阶段增长计算
                for (let i = 1; i <= years.value; i++) {
                    const cashFlow = initialCashFlow.value * Math.pow(1 + growthRate.value / 100, i);
                    const discountFactor = Math.pow(1 + discountRate.value / 100, i);
                    const presentValue = cashFlow / discountFactor;
                    cumulativePV += presentValue;

                    yearlyData.push({
                        year: i,
                        cashFlow,
                        discountFactor,
                        presentValue,
                        cumulativePV,
                        growthRate: growthRate.value,
                        formula: i === 1 ? `PV₁ = ${formatCurrency(presentValue)}` : `PV₁ + ... + PV${i} = ${formatCurrency(cumulativePV)}`
                    });

                    cashFlows.push(cashFlow);
                }
            } else {
                // 多阶段增长计算
                let currentYear = 0;
                let lastCashFlow = initialCashFlow.value;
                let totalYears = 0;

                // 验证阶段配置
                for (const stage of growthStages.value) {
                    if (!stage.years || stage.years <= 0 || !stage.growthRate && stage.growthRate !== 0) {
                        alert('请检查阶段配置，确保年限和增长率都已填写');
                        return;
                    }
                    totalYears += stage.years;
                }

                // 逐阶段计算
                for (let stageIndex = 0; stageIndex < growthStages.value.length; stageIndex++) {
                    const stage = growthStages.value[stageIndex];
                    
                    for (let yearInStage = 1; yearInStage <= stage.years; yearInStage++) {
                        currentYear++;
                        
                        // 计算当年现金流
                        const cashFlow = stageIndex === 0 && yearInStage === 1 
                            ? initialCashFlow.value * (1 + stage.growthRate / 100)
                            : lastCashFlow * (1 + stage.growthRate / 100);
                        
                        const discountFactor = Math.pow(1 + discountRate.value / 100, currentYear);
                        const presentValue = cashFlow / discountFactor;
                        cumulativePV += presentValue;

                        yearlyData.push({
                            year: currentYear,
                            stage: stage.name,
                            cashFlow,
                            discountFactor,
                            presentValue,
                            cumulativePV,
                            growthRate: stage.growthRate,
                            formula: `PV${currentYear} = ${formatCurrency(presentValue)}`
                        });

                        cashFlows.push(cashFlow);
                        lastCashFlow = cashFlow;
                    }
                }
                
                // 更新总年限
                years.value = totalYears;
            }

            // 计算终值
            const lastCashFlow = cashFlows[cashFlows.length - 1];
            const terminalValue = lastCashFlow * (1 + terminalGrowth.value / 100) /
                (discountRate.value / 100 - terminalGrowth.value / 100);

            // 终值现值公式: PV_TV = TV / (1 + r)^n
            const terminalValuePV = terminalValue / Math.pow(1 + discountRate.value / 100, years.value);

            const operatingValue = cumulativePV;
            const companyValue = operatingValue + terminalValuePV;

            // 计算每股合理价格
            const stockPrice = companyValue / shareCapital.value;

            // 添加终值行
            yearlyData.push({
                year: '终值',
                cashFlow: terminalValue,
                discountFactor: Math.pow(1 + discountRate.value / 100, years.value),
                presentValue: terminalValuePV,
                cumulativePV: companyValue,
                formula: `终值折现 = ${formatCurrency(terminalValuePV)}`,
                isTerminal: true
            });

            results.value = {
                calculated: true,
                companyValue,
                operatingValue,
                terminalValue: terminalValuePV,
                stockPrice,
                yearlyData
            };

            // 使用nextTick确保DOM更新后再创建图表
            nextTick(() => {
                updateChart(yearlyData.filter(item => !item.isTerminal));
            });
        };

        // 更新图表
        const updateChart = (yearlyData) => {
            // 确保canvas元素存在
            if (!chartCanvas.value) {
                console.error('Canvas element not found');
                return;
            }

            // 销毁旧图表实例
            if (chartInstance) {
                chartInstance.destroy();
            }

            const ctx = chartCanvas.value.getContext('2d');

            // 准备图表数据
            const labels = yearlyData.map(item => `第${item.year}年`);
            const cashFlowData = yearlyData.map(item => item.cashFlow);
            const presentValueData = yearlyData.map(item => item.presentValue);

            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: '自由现金流 (万元)',
                            data: cashFlowData,
                            borderColor: '#667eea',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: '现值 (万元)',
                            data: presentValueData,
                            borderColor: '#764ba2',
                            backgroundColor: 'rgba(118, 75, 162, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: '现金流趋势分析',
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '金额 (万元)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return value.toLocaleString('zh-CN');
                                }
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '年份'
                            }
                        }
                    }
                }
            });
        };

        // GitHub仓库链接
        const githubRepo = 'https://github.com/luolin1024/dcf-calculator';

        // 组件挂载时自动计算一次
        onMounted(() => {
            calculateDCF();
        });

        return {
            showFormulaHelp,
            initialCashFlow,
            growthRate,
            discountRate,
            years,
            terminalGrowth,
            shareCapital,
            growthMode,
            growthStages,
            results,
            chartCanvas,
            calculateDCF,
            addStage,
            removeStage,
            formatCurrency,
            githubRepo
        };
    }
}).mount('#app');