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

        // 计算DCF
        const calculateDCF = () => {
            const cashFlows = [];
            let cumulativePV = 0;
            const yearlyData = [];

            // 计算预测期现金流现值
            for (let i = 1; i <= years.value; i++) {
                const cashFlow = initialCashFlow.value * Math.pow(1 + growthRate.value / 100, i);
                const discountFactor = Math.pow(1 + discountRate.value / 100, i);
                const presentValue = cashFlow / discountFactor;
                cumulativePV += presentValue;

                // 生成累计现值公式
                const formula = i === 1
                    ? `PV₁ = ${formatCurrency(presentValue)}`
                    : `PV₁ + ... + PV${i} = ${formatCurrency(cumulativePV)}`;

                yearlyData.push({
                    year: i,
                    cashFlow,
                    discountFactor,
                    presentValue,
                    cumulativePV,
                    formula: formula
                });

                cashFlows.push(cashFlow);
            }

            // 计算终值
            const lastCashFlow = cashFlows[cashFlows.length - 1];
            // 终值公式: TV = [FCF_n × (1 + g)] / (r - g)
            // 其中: FCF_n = 最后一年现金流, g = 永续增长率, r = 折现率

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
                stockPrice, // 新增每股合理价格
                yearlyData
            };

            // 使用nextTick确保DOM更新后再创建图表
            nextTick(() => {
                updateChart(yearlyData.filter(item => !item.isTerminal)); // 图表不显示终值行
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
            shareCapital, // 新增股本输入
            results,
            chartCanvas,
            calculateDCF,
            formatCurrency,
            githubRepo
        };
    }
}).mount('#app');